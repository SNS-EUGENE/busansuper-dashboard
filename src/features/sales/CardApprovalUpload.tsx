import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface CardApprovalRow {
  date: string; // B열
  terminalNumber: string; // C열
  transactionNumber: string; // D열
  cardCompany: string; // G열 - 매입사
  approvalAmount: number; // I열
}

export default function CardApprovalUpload() {
  const { showAlert } = useAlert();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  const parseFile = (file: File): Promise<CardApprovalRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          const rows: CardApprovalRow[] = [];
          // 0행: 제목, 1행: 빈, 2행: 조건, 3-4행: 헤더(2줄), 5행부터 데이터
          // 실제: Row 1-2 제목/빈칸, Row 3 조건, Row 4-5 헤더, Row 6부터 데이터
          // 배열 인덱스로는 5까지 헤더, 6부터 데이터

          // 병합된 셀 처리: 이전 값 저장
          let lastDate = '';
          let lastTerminalNumber = '';

          for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];

            // 거래번호가 없으면 건너뛰기 (필수)
            if (!row[3]) continue;

            // 날짜 파싱 (Excel datetime 객체, 숫자, 또는 문자열)
            let date = '';
            if (row[1]) {
              if (row[1] instanceof Date) {
                // Date 객체
                const d = row[1] as Date;
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else if (typeof row[1] === 'number') {
                // Excel serial date number를 Date로 변환
                const excelEpoch = new Date(1899, 11, 30); // Excel epoch
                const d = new Date(excelEpoch.getTime() + row[1] * 86400000);
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else {
                // 문자열
                const dateStr = String(row[1]);
                const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                  date = dateMatch[1];
                }
              }

              if (date) {
                lastDate = date;
              }
            } else {
              date = lastDate; // 병합된 셀: 이전 값 사용
            }

            // 단말기번호 (병합된 셀 처리)
            const terminalNumber = row[2] ? String(row[2]).trim() : lastTerminalNumber;
            if (row[2]) lastTerminalNumber = terminalNumber;

            rows.push({
              date: date, // B열 (파싱)
              terminalNumber: terminalNumber, // C열
              transactionNumber: String(row[3] || '').trim(), // D열
              cardCompany: String(row[6] || '').trim(), // G열
              approvalAmount: Number(row[8]) || 0, // I열
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
      setProgress(`파싱 완료: ${rows.length}개 카드 승인 내역`);

      // 카드사 자동 등록
      setProgress('카드사 등록 중...');
      const cardCompanies = new Set<string>();
      rows.forEach((row) => {
        if (row.cardCompany && row.cardCompany.trim()) {
          cardCompanies.add(row.cardCompany.trim());
        }
      });

      for (const companyName of cardCompanies) {
        const { error } = await supabase
          .from('card_companies')
          .upsert({ name: companyName }, { onConflict: 'name', ignoreDuplicates: true });

        if (error && error.code !== '23505') {
          // 23505 = unique violation (이미 존재)
          console.error('카드사 등록 실패:', companyName, error);
        }
      }

      setProgress(`${cardCompanies.size}개 카드사 등록 완료`);

      // 카드사 ID 맵 생성
      const { data: cardCompanyData } = await supabase.from('card_companies').select('id, name');

      const cardCompanyMap = new Map<string, string>();
      cardCompanyData?.forEach((cc) => {
        cardCompanyMap.set(cc.name, cc.id);
      });

      // 기존 sales 데이터 업데이트
      setProgress('판매 데이터 업데이트 중...');
      let successCount = 0;
      let notFoundCount = 0;
      const notFoundReceipts: string[] = [];
      const matchedReceipts: string[] = [];

      console.log('\n========== 카드승인 업로드 시작 ==========');
      console.log(`총 ${rows.length}건의 카드 승인 내역 처리 중...`);

      for (const row of rows) {
        try {
          const receiptNumber = `${row.terminalNumber}${row.transactionNumber}`;

          // 기존 sales 찾기 (날짜 + 영수증번호로 매칭)
          const { data: existingSales, error: selectError } = await supabase
            .from('sales')
            .select('id, payment_type')
            .eq('sale_date', row.date)
            .eq('receipt_number', receiptNumber);

          if (selectError) {
            console.error('❌ 조회 실패:', selectError.message, '| 날짜:', row.date, '| 영수증:', receiptNumber);
          }

          if (!existingSales || existingSales.length === 0) {
            console.log(`❌ 미매칭: ${row.date} ${receiptNumber} (${row.cardCompany}) - 영수증 없음`);
            notFoundReceipts.push(`${row.date} ${receiptNumber} (${row.cardCompany})`);
            notFoundCount++;
            continue;
          }

          // 카드사 ID 가져오기
          const cardCompanyId = row.cardCompany
            ? cardCompanyMap.get(row.cardCompany)
            : null;

          // 해당 영수증의 모든 항목을 카드 결제로 업데이트
          for (const sale of existingSales) {
            await supabase
              .from('sales')
              .update({
                payment_type: 'card',
                card_company_id: cardCompanyId,
              })
              .eq('id', sale.id);
          }

          console.log(`✅ 매칭성공: ${row.date} ${receiptNumber} (${row.cardCompany}) - ${existingSales.length}개 항목 업데이트`);
          matchedReceipts.push(`${row.date} ${receiptNumber} (${row.cardCompany})`);
          successCount++;
        } catch (error: any) {
          console.error('❌ 처리 실패:', error);
          notFoundCount++;
        }

        setProgress(`처리 중... ${successCount + notFoundCount}/${rows.length}`);
      }

      console.log('\n========== 카드승인 업로드 완료 ==========');
      console.log(`✅ 매칭 성공: ${successCount}건`);
      console.log(`❌ 미매칭: ${notFoundCount}건`);

      if (matchedReceipts.length > 0) {
        console.log('\n[매칭된 영수증]');
        matchedReceipts.forEach(r => console.log(`  ${r}`));
      }

      if (notFoundReceipts.length > 0) {
        console.log('\n[미매칭 영수증 - DB에 해당 영수증 없음]');
        notFoundReceipts.forEach(r => console.log(`  ${r}`));
      }

      setProgress(
        `완료! 업데이트: ${successCount}건, 미매칭: ${notFoundCount}건`
      );

      if (notFoundCount > 0) {
        showAlert(`업로드 완료: 업데이트 ${successCount}건, 미매칭 ${notFoundCount}건\n\n자세한 내역은 브라우저 콘솔(F12)을 확인하세요.`, 'warning');
      } else {
        showAlert(`업로드 완료: ${successCount}건 업데이트!`, 'success');
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
        <h3 className="text-lg font-bold text-white mb-2">카드승인현황 업로드</h3>
        <p className="text-gray-400 text-sm">
          카드 승인 데이터를 업로드하면 <span className="text-green-400 font-bold">이미 등록된 영수증</span>의 결제 정보가 업데이트됩니다.
        </p>
        <p className="text-gray-500 text-sm mt-1">
          ※ 먼저 "영수증별매출상세현황"을 업로드한 후, 주기적으로 카드승인현황을 업로드하세요.
        </p>
      </div>

      {/* 파일 업로드 */}
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <label className="block text-sm font-bold text-gray-300 mb-2">
          카드승인현황 파일 (.xlsx)
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
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          <li>날짜 + 영수증번호로 <span className="text-green-400">이미 등록된 판매 데이터</span>를 찾아 업데이트합니다</li>
          <li>카드사(매입사)는 자동으로 등록되며, 수수료율은 정산관리에서 별도로 설정하세요</li>
          <li className="text-blue-400">재고는 변경되지 않습니다</li> (영수증 업로드 시 이미 차감됨)
          <li>매칭되지 않는 영수증은 건너뛰며, 미매칭 내역이 표시됩니다</li>
          <li>주/월 단위로 업로드하여 카드 결제 건을 일괄 업데이트할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}
