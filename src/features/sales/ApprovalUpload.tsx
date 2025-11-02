import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

type ApprovalType = 'card' | 'easy_pay' | 'cash_receipt';

interface CardApprovalRow {
  date: string;
  terminalNumber: string;
  transactionNumber: string;
  cardCompany: string;
  approvalAmount: number;
}

interface EasyPayApprovalRow {
  date: string;
  terminalNumber: string;
  transactionNumber: string;
  easyPayCompany: string;
  approvalAmount: number;
}

interface CashReceiptApprovalRow {
  date: string;
  terminalNumber: string;
  transactionNumber: string;
  approvalAmount: number;
}

export default function ApprovalUpload() {
  const { showAlert } = useAlert();
  const [approvalType, setApprovalType] = useState<ApprovalType>('card');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  const parseCardApprovalFile = (file: File): Promise<CardApprovalRow[]> => {
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
          let lastDate = '';
          let lastTerminalNumber = '';

          for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[3]) continue; // 거래번호 필수

            // 날짜 파싱
            let date = '';
            if (row[1]) {
              if (row[1] instanceof Date) {
                const d = row[1] as Date;
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else if (typeof row[1] === 'number') {
                const excelEpoch = new Date(1899, 11, 30);
                const d = new Date(excelEpoch.getTime() + row[1] * 86400000);
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else {
                const dateStr = String(row[1]);
                const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) date = dateMatch[1];
              }
              if (date) lastDate = date;
            } else {
              date = lastDate;
            }

            const terminalNumber = row[2] ? String(row[2]).trim() : lastTerminalNumber;
            if (row[2]) lastTerminalNumber = terminalNumber;

            rows.push({
              date: date,
              terminalNumber: terminalNumber,
              transactionNumber: String(row[3] || '').trim(),
              cardCompany: String(row[6] || '').trim(),
              approvalAmount: Number(row[8]) || 0,
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

  const parseEasyPayApprovalFile = (file: File): Promise<EasyPayApprovalRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          const rows: EasyPayApprovalRow[] = [];
          let lastDate = '';
          let lastTerminalNumber = '';

          for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[3]) continue;

            let date = '';
            if (row[1]) {
              if (row[1] instanceof Date) {
                const d = row[1] as Date;
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else if (typeof row[1] === 'number') {
                const excelEpoch = new Date(1899, 11, 30);
                const d = new Date(excelEpoch.getTime() + row[1] * 86400000);
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else {
                const dateStr = String(row[1]);
                const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) date = dateMatch[1];
              }
              if (date) lastDate = date;
            } else {
              date = lastDate;
            }

            const terminalNumber = row[2] ? String(row[2]).trim() : lastTerminalNumber;
            if (row[2]) lastTerminalNumber = terminalNumber;

            rows.push({
              date: date,
              terminalNumber: terminalNumber,
              transactionNumber: String(row[3] || '').trim(),
              easyPayCompany: String(row[6] || '').trim(), // 간편결제사 (G열)
              approvalAmount: Number(row[9]) || 0, // 승인요청금액 (J열)
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

  const parseCashReceiptApprovalFile = (file: File): Promise<CashReceiptApprovalRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          const rows: CashReceiptApprovalRow[] = [];
          let lastDate = '';
          let lastTerminalNumber = '';

          for (let i = 5; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[3]) continue;

            let date = '';
            if (row[1]) {
              if (row[1] instanceof Date) {
                const d = row[1] as Date;
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else if (typeof row[1] === 'number') {
                const excelEpoch = new Date(1899, 11, 30);
                const d = new Date(excelEpoch.getTime() + row[1] * 86400000);
                date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else {
                const dateStr = String(row[1]);
                const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) date = dateMatch[1];
              }
              if (date) lastDate = date;
            } else {
              date = lastDate;
            }

            const terminalNumber = row[2] ? String(row[2]).trim() : lastTerminalNumber;
            if (row[2]) lastTerminalNumber = terminalNumber;

            rows.push({
              date: date,
              terminalNumber: terminalNumber,
              transactionNumber: String(row[3] || '').trim(),
              approvalAmount: Number(row[9]) || 0, // 추정: J열
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

  const processCardApproval = async (rows: CardApprovalRow[]) => {
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

        const cardCompanyId = row.cardCompany ? cardCompanyMap.get(row.cardCompany) : null;

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

    setProgress(`완료! 업데이트: ${successCount}건, 미매칭: ${notFoundCount}건`);

    if (notFoundCount > 0) {
      showAlert(`업로드 완료: 업데이트 ${successCount}건, 미매칭 ${notFoundCount}건\n\n자세한 내역은 브라우저 콘솔(F12)을 확인하세요.`, 'warning');
    } else {
      showAlert(`업로드 완료: ${successCount}건 업데이트!`, 'success');
    }
  };

  const processEasyPayApproval = async (rows: EasyPayApprovalRow[]) => {
    // 간편결제사 자동 등록
    setProgress('간편결제사 등록 중...');
    const easyPayCompanies = new Set<string>();
    rows.forEach((row) => {
      if (row.easyPayCompany && row.easyPayCompany.trim()) {
        easyPayCompanies.add(row.easyPayCompany.trim());
      }
    });

    for (const companyName of easyPayCompanies) {
      const { error } = await supabase
        .from('easy_pay_companies')
        .upsert({ name: companyName }, { onConflict: 'name', ignoreDuplicates: true });

      if (error && error.code !== '23505') {
        console.error('간편결제사 등록 실패:', companyName, error);
      }
    }

    setProgress(`${easyPayCompanies.size}개 간편결제사 등록 완료`);

    // 간편결제사 ID 맵 생성
    const { data: easyPayCompanyData } = await supabase.from('easy_pay_companies').select('id, name');
    const easyPayCompanyMap = new Map<string, string>();
    easyPayCompanyData?.forEach((ep) => {
      easyPayCompanyMap.set(ep.name, ep.id);
    });

    // 기존 sales 데이터 업데이트
    setProgress('판매 데이터 업데이트 중...');
    let successCount = 0;
    let notFoundCount = 0;
    const notFoundReceipts: string[] = [];
    const matchedReceipts: string[] = [];

    console.log('\n========== 간편결제 업로드 시작 ==========');
    console.log(`총 ${rows.length}건의 간편결제 승인 내역 처리 중...`);

    for (const row of rows) {
      try {
        const receiptNumber = `${row.terminalNumber}${row.transactionNumber}`;

        const { data: existingSales, error: selectError } = await supabase
          .from('sales')
          .select('id, payment_type')
          .eq('sale_date', row.date)
          .eq('receipt_number', receiptNumber);

        if (selectError) {
          console.error('❌ 조회 실패:', selectError.message, '| 날짜:', row.date, '| 영수증:', receiptNumber);
        }

        if (!existingSales || existingSales.length === 0) {
          console.log(`❌ 미매칭: ${row.date} ${receiptNumber} (${row.easyPayCompany}) - 영수증 없음`);
          notFoundReceipts.push(`${row.date} ${receiptNumber} (${row.easyPayCompany})`);
          notFoundCount++;
          continue;
        }

        const easyPayCompanyId = row.easyPayCompany ? easyPayCompanyMap.get(row.easyPayCompany) : null;

        for (const sale of existingSales) {
          await supabase
            .from('sales')
            .update({
              payment_type: 'easy_pay',
              easy_pay_company_id: easyPayCompanyId,
            })
            .eq('id', sale.id);
        }

        console.log(`✅ 매칭성공: ${row.date} ${receiptNumber} (${row.easyPayCompany}) - ${existingSales.length}개 항목 업데이트`);
        matchedReceipts.push(`${row.date} ${receiptNumber} (${row.easyPayCompany})`);
        successCount++;
      } catch (error: any) {
        console.error('❌ 처리 실패:', error);
        notFoundCount++;
      }

      setProgress(`처리 중... ${successCount + notFoundCount}/${rows.length}`);
    }

    console.log('\n========== 간편결제 업로드 완료 ==========');
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

    setProgress(`완료! 업데이트: ${successCount}건, 미매칭: ${notFoundCount}건`);

    if (notFoundCount > 0) {
      showAlert(`업로드 완료: 업데이트 ${successCount}건, 미매칭 ${notFoundCount}건\n\n자세한 내역은 브라우저 콘솔(F12)을 확인하세요.`, 'warning');
    } else {
      showAlert(`업로드 완료: ${successCount}건 업데이트!`, 'success');
    }
  };

  const processCashReceiptApproval = async (rows: CashReceiptApprovalRow[]) => {
    setProgress('판매 데이터 업데이트 중...');
    let successCount = 0;
    let notFoundCount = 0;
    const notFoundReceipts: string[] = [];
    const matchedReceipts: string[] = [];

    console.log('\n========== 현금영수증 업로드 시작 ==========');
    console.log(`총 ${rows.length}건의 현금영수증 승인 내역 처리 중...`);

    for (const row of rows) {
      try {
        const receiptNumber = `${row.terminalNumber}${row.transactionNumber}`;

        const { data: existingSales, error: selectError } = await supabase
          .from('sales')
          .select('id, payment_type')
          .eq('sale_date', row.date)
          .eq('receipt_number', receiptNumber);

        if (selectError) {
          console.error('❌ 조회 실패:', selectError.message, '| 날짜:', row.date, '| 영수증:', receiptNumber);
        }

        if (!existingSales || existingSales.length === 0) {
          console.log(`❌ 미매칭: ${row.date} ${receiptNumber} - 영수증 없음`);
          notFoundReceipts.push(`${row.date} ${receiptNumber}`);
          notFoundCount++;
          continue;
        }

        for (const sale of existingSales) {
          await supabase
            .from('sales')
            .update({
              payment_type: 'cash_receipt',
            })
            .eq('id', sale.id);
        }

        console.log(`✅ 매칭성공: ${row.date} ${receiptNumber} - ${existingSales.length}개 항목 업데이트`);
        matchedReceipts.push(`${row.date} ${receiptNumber}`);
        successCount++;
      } catch (error: any) {
        console.error('❌ 처리 실패:', error);
        notFoundCount++;
      }

      setProgress(`처리 중... ${successCount + notFoundCount}/${rows.length}`);
    }

    console.log('\n========== 현금영수증 업로드 완료 ==========');
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

    setProgress(`완료! 업데이트: ${successCount}건, 미매칭: ${notFoundCount}건`);

    if (notFoundCount > 0) {
      showAlert(`업로드 완료: 업데이트 ${successCount}건, 미매칭 ${notFoundCount}건\n\n자세한 내역은 브라우저 콘솔(F12)을 확인하세요.`, 'warning');
    } else {
      showAlert(`업로드 완료: ${successCount}건 업데이트!`, 'success');
    }
  };

  const processUpload = async () => {
    if (!file) {
      showAlert('파일을 선택해주세요.', 'warning');
      return;
    }

    try {
      setProcessing(true);
      setProgress('파일 파싱 중...');

      if (approvalType === 'card') {
        const rows = await parseCardApprovalFile(file);
        setProgress(`파싱 완료: ${rows.length}개 카드 승인 내역`);
        await processCardApproval(rows);
      } else if (approvalType === 'easy_pay') {
        const rows = await parseEasyPayApprovalFile(file);
        setProgress(`파싱 완료: ${rows.length}개 간편결제 승인 내역`);
        await processEasyPayApproval(rows);
      } else if (approvalType === 'cash_receipt') {
        const rows = await parseCashReceiptApprovalFile(file);
        setProgress(`파싱 완료: ${rows.length}개 현금영수증 승인 내역`);
        await processCashReceiptApproval(rows);
      }

      setFile(null);
    } catch (error: any) {
      console.error('업로드 처리 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
      setProgress(`오류 발생: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getApprovalTypeLabel = () => {
    switch (approvalType) {
      case 'card':
        return '카드승인';
      case 'easy_pay':
        return '간편결제';
      case 'cash_receipt':
        return '현금영수증';
    }
  };

  const getApprovalTypeDescription = () => {
    switch (approvalType) {
      case 'card':
        return '카드 승인 데이터를 업로드하면 이미 등록된 영수증의 결제 정보가 카드로 업데이트됩니다.';
      case 'easy_pay':
        return '간편결제 승인 데이터를 업로드하면 이미 등록된 영수증의 결제 정보가 간편결제로 업데이트됩니다.';
      case 'cash_receipt':
        return '현금영수증 승인 데이터를 업로드하면 이미 등록된 영수증의 결제 정보가 현금영수증으로 업데이트됩니다.';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">승인내역 업로드</h3>
        <p className="text-gray-400 text-sm">
          {getApprovalTypeDescription()}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          ※ 먼저 "영수증별매출상세현황"을 업로드한 후, 주기적으로 승인내역을 업로드하세요.
        </p>
      </div>

      {/* 승인 유형 선택 */}
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <label className="block text-sm font-bold text-gray-300 mb-3">
          승인 유형 선택
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setApprovalType('card');
              setFile(null);
              setProgress('');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              approvalType === 'card'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            카드승인
          </button>
          <button
            onClick={() => {
              setApprovalType('easy_pay');
              setFile(null);
              setProgress('');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              approvalType === 'easy_pay'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            간편결제
          </button>
          <button
            onClick={() => {
              setApprovalType('cash_receipt');
              setFile(null);
              setProgress('');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              approvalType === 'cash_receipt'
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            현금영수증
          </button>
        </div>
      </div>

      {/* 파일 업로드 */}
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <label className="block text-sm font-bold text-gray-300 mb-2">
          {getApprovalTypeLabel()} 파일 (.xlsx)
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
          {approvalType === 'card' && (
            <>
              <li>카드사(매입사)는 자동으로 등록되며, 수수료율은 정산관리에서 별도로 설정하세요</li>
            </>
          )}
          {approvalType === 'easy_pay' && (
            <>
              <li>간편결제사는 자동으로 등록되며, 수수료율은 정산관리에서 별도로 설정하세요</li>
            </>
          )}
          <li className="text-blue-400">재고는 변경되지 않습니다 (영수증 업로드 시 이미 차감됨)</li>
          <li>매칭되지 않는 영수증은 건너뛰며, 미매칭 내역이 표시됩니다</li>
          <li>주/월 단위로 업로드하여 결제 건을 일괄 업데이트할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}
