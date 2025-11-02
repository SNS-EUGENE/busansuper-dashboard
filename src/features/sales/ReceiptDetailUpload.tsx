import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface ReceiptDetailRow {
  date: string; // A열
  terminalNumber: string; // B열
  transactionNumber: string; // C열
  paymentType: string; // D열 - 구분 (현금/카드)
  productCode: string; // H열
  barcode: string; // I열
  quantity: number; // K열
  saleAmount: number; // O열
}

export default function ReceiptDetailUpload() {
  const { showAlert } = useAlert();
  const [file, setFile] = useState<File | null>(null);
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

            rows.push({
              date: date,
              terminalNumber: terminalNumber, // A열
              transactionNumber: transactionNumber, // B열
              paymentType: paymentType, // C열
              productCode: String(row[6] || '').trim(), // G열
              barcode: String(row[7] || '').trim(), // H열
              quantity: Number(row[9]) || 0, // J열
              saleAmount: Number(row[10]) || 0, // K열
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
    if (!file) {
      showAlert('파일을 선택해주세요.', 'warning');
      return;
    }

    try {
      setProcessing(true);
      setProgress('파일 파싱 중...');

      const rows = await parseFile(file);
      setProgress(`파싱 완료: ${rows.length}개 항목`);

      // 영수증 번호별로 그룹핑
      const receiptGroups = new Map<string, ReceiptDetailRow[]>();
      for (const row of rows) {
        const receiptNumber = `${row.terminalNumber}${row.transactionNumber}`;
        if (!receiptGroups.has(receiptNumber)) {
          receiptGroups.set(receiptNumber, []);
        }
        receiptGroups.get(receiptNumber)!.push(row);
      }

      let successCount = 0;
      let errorCount = 0;
      let overwriteCount = 0;
      let processedCount = 0;
      const errors: string[] = [];
      const processedReceipts = new Set<string>();

      for (const row of rows) {
        try {
          // 상품 찾기 (상품코드 또는 바코드로)
          const { data: products } = await supabase
            .from('products')
            .select('id, current_stock, name, product_code')
            .or(`product_code.eq.${row.productCode},barcode.eq.${row.barcode}`)
            .limit(1);

          if (!products || products.length === 0) {
            const errorMsg = `상품을 찾을 수 없음: ${row.productCode} / ${row.barcode}`;
            console.warn(errorMsg);
            errors.push(errorMsg);
            errorCount++;
            continue;
          }

          const product = products[0];

          // 영수증 번호 생성
          const receiptNumber = `${row.terminalNumber}${row.transactionNumber}`;

          // 디버깅: 첫 5개 영수증 번호 출력
          if (processedCount < 5) {
            console.log('영수증 - 날짜:', row.date, '영수증:', receiptNumber, '단말기:', row.terminalNumber, '거래:', row.transactionNumber, '상품:', row.productCode);
          }

          // 중복 영수증 체크 및 삭제 (영수증당 한 번만)
          if (!processedReceipts.has(receiptNumber)) {
            const { data: existingReceipt } = await supabase
              .from('sales')
              .select('id, product_id, quantity')
              .eq('sale_date', row.date)
              .eq('receipt_number', receiptNumber);

            if (existingReceipt && existingReceipt.length > 0) {
              // 기존 판매 건의 재고를 원복
              for (const sale of existingReceipt) {
                const { data: prod } = await supabase
                  .from('products')
                  .select('current_stock')
                  .eq('id', sale.product_id)
                  .single();

                if (prod) {
                  await supabase
                    .from('products')
                    .update({ current_stock: prod.current_stock + sale.quantity })
                    .eq('id', sale.product_id);
                }
              }

              // 기존 판매 레코드 삭제
              await supabase
                .from('sales')
                .delete()
                .eq('sale_date', row.date)
                .eq('receipt_number', receiptNumber);

              overwriteCount++;
            }

            processedReceipts.add(receiptNumber);
          }

          // 재고 부족 체크 (강제 차감 옵션이 꺼져있을 때만)
          if (!forceDeduct && product.current_stock < row.quantity) {
            const errorMsg = `재고 부족: ${product.name} (필요: ${row.quantity}, 현재: ${product.current_stock})`;
            console.warn(errorMsg);
            errors.push(errorMsg);
            errorCount++;
            continue;
          }

          // 판매 데이터 생성 (일단 현금으로, 카드승인현황 업로드 시 업데이트됨)
          const { error: saleError } = await supabase.from('sales').insert({
            product_id: product.id,
            quantity: row.quantity,
            unit_price: Math.round(row.saleAmount / row.quantity),
            total_amount: row.saleAmount,
            sale_date: row.date,
            payment_type: 'cash', // 일단 현금으로, 카드승인현황으로 나중에 업데이트
            card_company_id: null,
            receipt_number: receiptNumber,
          });

          if (saleError) {
            console.error('판매 데이터 생성 실패:', saleError);
            errors.push(`판매 기록 실패: ${product.name} - ${saleError.message}`);
            errorCount++;
            continue;
          }

          // 재고 차감
          const newStock = product.current_stock - row.quantity;
          await supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', product.id);

          // 재고 변동 기록
          await supabase.from('inventory_changes').insert({
            product_id: product.id,
            change_type: 'out',
            quantity: -row.quantity,
            note: `판매 (영수증: ${receiptNumber})`,
            previous_stock: product.current_stock,
            new_stock: newStock,
          });

          successCount++;
        } catch (error: any) {
          console.error('행 처리 실패:', error);
          errors.push(`오류: ${error.message}`);
          errorCount++;
        }

        processedCount++;
        setProgress(`처리 중... ${processedCount}/${rows.length}`);
      }

      setProgress(
        `완료! 성공: ${successCount}건, 실패: ${errorCount}건${overwriteCount > 0 ? `, 덮어쓴 영수증: ${overwriteCount}개` : ''}`
      );

      if (errors.length > 0 && errors.length <= 10) {
        showAlert(`업로드 완료\n성공: ${successCount}건, 실패: ${errorCount}건${overwriteCount > 0 ? `, 덮어쓴 영수증: ${overwriteCount}개` : ''}\n\n오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...외 ${errors.length - 5}건` : ''}`, 'warning');
      } else if (errorCount > 0 || overwriteCount > 0) {
        showAlert(`업로드 완료: 성공 ${successCount}건, 실패 ${errorCount}건${overwriteCount > 0 ? `, 덮어쓴 영수증 ${overwriteCount}개` : ''}`, overwriteCount > 0 ? 'warning' : 'success');
      } else {
        showAlert(`업로드 완료: ${successCount}건 성공!`, 'success');
      }

      // 파일 초기화
      setFile(null);
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
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
        />
        {file && (
          <p className="text-green-400 text-sm mt-2">✓ {file.name}</p>
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
          disabled={!file || processing}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? '처리 중...' : '업로드 시작'}
        </button>

        {file && !processing && (
          <button
            onClick={() => {
              setFile(null);
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
