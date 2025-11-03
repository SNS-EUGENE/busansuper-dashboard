import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface ReceiptDetailRow {
  date: string; // 날짜 (파일명에서 추출)
  terminalNumber: string; // 포스번호
  transactionNumber: string; // 영수증번호
  paymentType: string; // 구분 (현금/카드)
  saleTime: string; // 결제시각
  productCode: string; // 상품코드
  barcode: string; // 바코드
  quantity: number; // 수량
  totalAmount: number; // 총매출액
  discountAmount: number; // 할인액
  actualSaleAmount: number; // 실매출액
}

export default function ReceiptDetailUpload() {
  const { showAlert } = useAlert();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [forceDeduct, setForceDeduct] = useState(false);

  const parseFile = (file: File): Promise<ReceiptDetailRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          const rows: ReceiptDetailRow[] = [];
          // 0행: 제목, 1행: 빈, 2행: 조건, 3행: 헤더, 4행부터 데이터

          // 날짜는 2행의 조회조건에서 추출 (예: "조회조건 : 2025-10-29")
          let date = '';
          if (jsonData[2] && jsonData[2][0]) {
            const dateMatch = String(jsonData[2][0]).match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              date = dateMatch[1];
            }
          }

          // 병합된 셀 처리: 이전 값 저장
          let lastTerminalNumber = '';
          let lastTransactionNumber = '';
          let lastPaymentType = '';

          for (let i = 4; i < jsonData.length; i++) {
            const row = jsonData[i];

            // 상품 데이터가 없으면 건너뛰기 (빈 행)
            if (!row[6] && !row[7]) continue;

            // 병합된 셀 처리: None이면 이전 값 사용
            const terminalNumber = row[0] ? String(row[0]).trim() : lastTerminalNumber;
            const transactionNumber = row[1] ? String(row[1]).trim() : lastTransactionNumber;
            const paymentType = row[2] ? String(row[2]).trim() : lastPaymentType;

            // 다음 행을 위해 저장
            if (row[0]) lastTerminalNumber = terminalNumber;
            if (row[1]) lastTransactionNumber = transactionNumber;
            if (row[2]) lastPaymentType = paymentType;

            // 결제시각 추출 (시:분:초 형식)
            const saleTime = row[5] ? String(row[5]).trim() : '';

            rows.push({
              date: date,
              terminalNumber: terminalNumber, // 포스번호
              transactionNumber: transactionNumber, // 영수증번호
              paymentType: paymentType, // 구분
              saleTime: saleTime, // 결제시각
              productCode: String(row[6] || '').trim(), // 상품코드
              barcode: String(row[7] || '').trim(), // 바코드
              quantity: Number(row[9]) || 0, // 수량
              totalAmount: Number(row[10]) || 0, // 총매출액
              discountAmount: Number(row[11]) || 0, // 할인액
              actualSaleAmount: Number(row[13]) || 0, // 실매출액
            });
          }

          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const processUpload = async () => {
    if (files.length === 0) {
      showAlert('파일을 선택해주세요.', 'warning');
      return;
    }

    try {
      setProcessing(true);

      let totalSuccess = 0;
      let totalError = 0;
      let totalOverwrite = 0;
      const allErrors: string[] = [];

      // 파일을 순차적으로 처리
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        setProgress(`[${fileIndex + 1}/${files.length}] ${file.name} 처리 중...`);

        try {
          const rows = await parseFile(file);
          setProgress(`[${fileIndex + 1}/${files.length}] ${file.name} 파싱 완료 (${rows.length}행)`);

          let successCount = 0;
          let errorCount = 0;
          let overwriteCount = 0;
          const errors: string[] = [];

          // 1. 날짜와 영수증 번호 목록 추출
          const dates = [...new Set(rows.map(r => r.date))];
          const receiptNumbers = [...new Set(rows.map(r => `${r.terminalNumber}${r.transactionNumber}`))];

          setProgress(`[${fileIndex + 1}/${files.length}] 중복 체크 중...`);

          // 2. 기존 영수증 한 번에 조회
          const { data: existingReceipts } = await supabase
            .from('sales')
            .select('sale_date, receipt_number, product_id, quantity')
            .in('sale_date', dates)
            .in('receipt_number', receiptNumbers);

          // 3. 중복 영수증 처리
          if (existingReceipts && existingReceipts.length > 0) {
            // 영수증별 그룹핑
            const receiptMap = new Map<string, any[]>();
            for (const sale of existingReceipts) {
              const key = `${sale.sale_date}-${sale.receipt_number}`;
              if (!receiptMap.has(key)) {
                receiptMap.set(key, []);
              }
              receiptMap.get(key)!.push(sale);
            }
            overwriteCount = receiptMap.size;

            // 재고 원복 계산
            const stockRestoreMap = new Map<number, number>();
            for (const sale of existingReceipts) {
              const current = stockRestoreMap.get(sale.product_id) || 0;
              stockRestoreMap.set(sale.product_id, current + sale.quantity);
            }

            setProgress(`[${fileIndex + 1}/${files.length}] 재고 원복 중 (${stockRestoreMap.size}개 상품)...`);

            // 재고 원복 실행
            for (const [productId, quantity] of stockRestoreMap) {
              const { data: prod } = await supabase
                .from('products')
                .select('current_stock')
                .eq('id', productId)
                .single();

              if (prod) {
                await supabase
                  .from('products')
                  .update({ current_stock: prod.current_stock + quantity })
                  .eq('id', productId);
              }
            }

            // 기존 판매 레코드 삭제
            await supabase
              .from('sales')
              .delete()
              .in('sale_date', dates)
              .in('receipt_number', receiptNumbers);
          }

          setProgress(`[${fileIndex + 1}/${files.length}] 상품 정보 조회 중...`);

          // 4. 모든 상품 한 번에 조회
          const productCodes = [...new Set(rows.map(r => r.productCode).filter(Boolean))];
          const barcodes = [...new Set(rows.map(r => r.barcode).filter(Boolean))];

          const orConditions: string[] = [];
          if (productCodes.length > 0) {
            orConditions.push(`product_code.in.(${productCodes.join(',')})`);
          }
          if (barcodes.length > 0) {
            orConditions.push(`barcode.in.(${barcodes.join(',')})`);
          }

          const { data: products } = await supabase
            .from('products')
            .select('id, current_stock, name, product_code, barcode')
            .or(orConditions.join(','));

          // 상품 맵 생성 (빠른 조회용)
          const productMap = new Map<string, any>();
          for (const prod of products || []) {
            if (prod.product_code) productMap.set(prod.product_code, prod);
            if (prod.barcode) productMap.set(prod.barcode, prod);
          }

          setProgress(`[${fileIndex + 1}/${files.length}] 판매 데이터 준비 중...`);

          // 5. 판매/재고변동 데이터 배치 준비
          const salesToInsert: any[] = [];
          const inventoryChangesToInsert: any[] = [];
          const stockChanges = new Map<number, number>(); // productId -> 총 변경량

          for (const row of rows) {
            try {
              const product = productMap.get(row.productCode) || productMap.get(row.barcode);

              if (!product) {
                errors.push(`상품을 찾을 수 없음: ${row.productCode} / ${row.barcode}`);
                errorCount++;
                continue;
              }

              const receiptNumber = `${row.terminalNumber}${row.transactionNumber}`;
              const saleDatetime = row.saleTime ? `${row.date} ${row.saleTime}` : row.date;

              // 재고 부족 체크 (누적 변경량 고려)
              const currentChange = stockChanges.get(product.id) || 0;
              const projectedStock = product.current_stock + currentChange - row.quantity;

              if (!forceDeduct && projectedStock < 0) {
                errors.push(`재고 부족: ${product.name} (필요: ${row.quantity}, 현재: ${product.current_stock + currentChange})`);
                errorCount++;
                continue;
              }

              // sales 데이터 준비
              salesToInsert.push({
                product_id: product.id,
                quantity: row.quantity,
                unit_price: Math.round(row.totalAmount / row.quantity),
                total_amount: row.totalAmount,
                discount_amount: row.discountAmount,
                actual_sale_amount: row.actualSaleAmount,
                sale_date: row.date,
                sale_datetime: saleDatetime,
                payment_type: 'cash',
                card_company_id: null,
                receipt_number: receiptNumber,
              });

              // inventory_changes 데이터 준비
              const previousStock = product.current_stock + currentChange;
              const newStock = previousStock - row.quantity;

              inventoryChangesToInsert.push({
                product_id: product.id,
                change_type: 'sale',
                quantity: -row.quantity,
                note: `판매 (영수증: ${receiptNumber})`,
                previous_stock: previousStock,
                new_stock: newStock,
                created_at: saleDatetime,
              });

              // 재고 변경 누적
              stockChanges.set(product.id, currentChange - row.quantity);
              successCount++;
            } catch (error: any) {
              errors.push(`행 처리 오류: ${error.message}`);
              errorCount++;
            }
          }

          setProgress(`[${fileIndex + 1}/${files.length}] 배치 저장 중 (${salesToInsert.length}건)...`);

          // 6. 배치 insert
          if (salesToInsert.length > 0) {
            const { error: salesError } = await supabase.from('sales').insert(salesToInsert);
            if (salesError) {
              errors.push(`판매 배치 저장 실패: ${salesError.message}`);
            }
          }

          if (inventoryChangesToInsert.length > 0) {
            const { error: invError } = await supabase
              .from('inventory_changes')
              .insert(inventoryChangesToInsert);
            if (invError) {
              errors.push(`재고변동 배치 저장 실패: ${invError.message}`);
            }
          }

          setProgress(`[${fileIndex + 1}/${files.length}] 재고 업데이트 중 (${stockChanges.size}개 상품)...`);

          // 7. 재고 업데이트
          for (const [productId, changeAmount] of stockChanges) {
            const product = products?.find(p => p.id === productId);
            if (product) {
              await supabase
                .from('products')
                .update({ current_stock: product.current_stock + changeAmount })
                .eq('id', productId);
            }
          }

          // 파일별 결과 누적
          totalSuccess += successCount;
          totalError += errorCount;
          totalOverwrite += overwriteCount;
          allErrors.push(...errors);

          setProgress(
            `[${fileIndex + 1}/${files.length}] ${file.name} 완료 - 성공: ${successCount}, 실패: ${errorCount}, 덮어쓰기: ${overwriteCount}`
          );
        } catch (fileError: any) {
          console.error(`파일 처리 실패 (${file.name}):`, fileError);
          allErrors.push(`파일 처리 실패 (${file.name}): ${fileError.message}`);
          totalError++;
        }
      }

      // 전체 결과 표시
      setProgress(
        `전체 완료! 총 성공: ${totalSuccess}건, 실패: ${totalError}건${totalOverwrite > 0 ? `, 덮어쓴 영수증: ${totalOverwrite}개` : ''}`
      );

      if (allErrors.length > 0 && allErrors.length <= 10) {
        showAlert(
          `업로드 완료\n성공: ${totalSuccess}건, 실패: ${totalError}건${totalOverwrite > 0 ? `, 덮어쓴 영수증: ${totalOverwrite}개` : ''}\n\n오류:\n${allErrors.slice(0, 5).join('\n')}${allErrors.length > 5 ? `\n...외 ${allErrors.length - 5}건` : ''}`,
          'warning'
        );
      } else if (totalError > 0 || totalOverwrite > 0) {
        showAlert(
          `업로드 완료: 성공 ${totalSuccess}건, 실패 ${totalError}건${totalOverwrite > 0 ? `, 덮어쓴 영수증 ${totalOverwrite}개` : ''}`,
          totalError > 0 ? 'warning' : 'success'
        );
      } else {
        showAlert(`업로드 완료: ${totalSuccess}건 성공!`, 'success');
      }

      // 파일 초기화
      setFiles([]);
    } catch (error: any) {
      console.error('업로드 처리 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
      setProgress(`오류 발생: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">영수증별매출상세현황 업로드</h3>
        <p className="text-gray-400 text-sm">
          영수증 데이터를 업로드하면 판매 기록이 생성되고 <span className="text-yellow-400 font-bold">재고가 자동으로 차감</span>됩니다.
        </p>
        <p className="text-gray-500 text-sm mt-1">
          ※ 카드 결제 정보는 "카드승인현황 업로드"에서 나중에 업데이트할 수 있습니다.
        </p>
      </div>

      {/* 파일 업로드 */}
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <label className="block text-sm font-bold text-gray-300 mb-2">
          영수증별매출상세현황 파일 (.xlsx)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="w-full bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
        />
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, idx) => (
              <p key={idx} className="text-green-400 text-sm">✓ {f.name}</p>
            ))}
            <p className="text-gray-400 text-xs">총 {files.length}개 파일 선택됨</p>
          </div>
        )}
      </div>

      {/* 업로드 옵션 */}
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={forceDeduct}
            onChange={(e) => setForceDeduct(e.target.checked)}
            className="w-4 h-4 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <span className="ml-3 text-white font-medium">재고 부족 시에도 강제 차감 (음수 허용)</span>
        </label>
        <p className="text-gray-400 text-xs mt-2 ml-7">
          ※ 체크하면 재고가 부족해도 판매를 등록하고 재고를 마이너스로 차감합니다
        </p>
      </div>

      {/* 진행 상황 */}
      {progress && (
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <p className="text-white font-medium">{progress}</p>
        </div>
      )}

      {/* 업로드 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={processUpload}
          disabled={files.length === 0 || processing}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? '처리 중...' : `업로드 시작 (${files.length}개 파일)`}
        </button>

        {files.length > 0 && !processing && (
          <button
            onClick={() => {
              setFiles([]);
              setProgress('');
            }}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition"
          >
            파일 초기화
          </button>
        )}
      </div>

      {/* 안내사항 */}
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <h4 className="text-white font-bold mb-2">처리 안내</h4>
        <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
          <li>상품은 상품코드 또는 바코드로 자동 매칭됩니다</li>
          <li className="text-yellow-400 font-bold">판매 수량만큼 재고가 즉시 차감됩니다</li>
          <li>재고가 부족한 경우 해당 건은 건너뜁니다</li>
          <li>결제 방식은 일단 "현금"으로 등록됩니다</li>
          <li>카드 결제 건은 "카드승인현황 업로드"에서 나중에 업데이트하세요</li>
          <li>매칭되지 않는 상품은 건너뛰며, 오류 내역이 표시됩니다</li>
        </ul>
      </div>
    </div>
  );
}
