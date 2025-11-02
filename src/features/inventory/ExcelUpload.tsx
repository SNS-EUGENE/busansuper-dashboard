import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface ExcelUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// 엑셀 컬럼 인덱스 (영업정보시스템 형식)
const EXCEL_COLUMNS = {
  PRODUCT_CODE: 1,   // B열: 상품코드
  PRODUCT_NAME: 2,   // C열: 상품명
  CATEGORY: 3,       // D열: 분류명
  COMPANY: 4,        // E열: 거래처
  PRICE: 10,         // K열: 판매단가
  BARCODE: 17,       // R열: 바코드
  INITIAL_STOCK: 25  // Z열: 초기재고 (추가된 컬럼)
};

export default function ExcelUpload({ onSuccess, onCancel }: ExcelUploadProps) {
  const { showAlert } = useAlert();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showAlert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.', 'warning');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: null,
      });

      await processExcelData(jsonData as any[][]);

      showAlert('엑셀 업로드가 완료되었습니다!', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('엑셀 업로드 실패:', error);
      showAlert(`업로드 실패: ${error.message}`, 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const processExcelData = async (data: any[][]) => {
    const cols = EXCEL_COLUMNS;
    const products: any[] = [];
    const vendorMap = new Map<string, string>();
    const categoryMap = new Map<string, string>();

    // 기존 업체 및 카테고리 로드
    const { data: existingVendors } = await supabase.from('vendors').select('id, company, short_name');
    const { data: existingCategories } = await supabase.from('categories').select('id, name');

    existingVendors?.forEach((v) => {
      vendorMap.set(v.company, v.id);
      if (v.short_name) vendorMap.set(v.short_name, v.id);
    });

    existingCategories?.forEach((c) => {
      categoryMap.set(c.name, c.id);
    });

    // 데이터 처리 (첫 행은 헤더이므로 스킵)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[cols.PRODUCT_CODE]) continue;

      const productCode = String(row[cols.PRODUCT_CODE] || '').trim();
      const companyName = String(row[cols.COMPANY] || '').trim();
      const categoryName = String(row[cols.CATEGORY] || '').trim();

      if (!productCode) continue;

      // 업체 처리
      let vendorId = vendorMap.get(companyName);
      if (!vendorId && companyName) {
        const { data: newVendor } = await supabase
          .from('vendors')
          .insert([{ company: companyName, short_name: companyName }])
          .select()
          .single();
        if (newVendor) {
          vendorId = newVendor.id;
          vendorMap.set(companyName, vendorId);
        }
      }

      // 카테고리 처리
      let categoryId = categoryMap.get(categoryName);
      if (!categoryId && categoryName) {
        const { data: newCategory } = await supabase
          .from('categories')
          .insert([{ name: categoryName }])
          .select()
          .single();
        if (newCategory) {
          categoryId = newCategory.id;
          categoryMap.set(categoryName, categoryId);
        }
      }

      const initialStock = parseInt(row[cols.INITIAL_STOCK]) || 0;

      const product = {
        product_code: productCode,
        barcode: String(row[cols.BARCODE] || '').trim() || null,
        name: String(row[cols.PRODUCT_NAME] || '').trim(),
        price: parseFloat(row[cols.PRICE]) || 0,
        vendor_id: vendorId || null,
        category_id: categoryId || null,
        initial_stock: initialStock,
        optimal_stock: initialStock,
        current_stock: initialStock,
        low_stock_threshold: 10,
      };

      products.push(product);

      // 진행률 업데이트
      setProgress(Math.round(((i + 1) / data.length) * 100));
    }

    // 배치 저장 (upsert)
    if (products.length > 0) {
      const { error } = await supabase.from('products').upsert(products, {
        onConflict: 'product_code',
      });

      if (error) throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
          dragActive
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-gray-600 bg-gray-700/50 hover:border-blue-500 hover:bg-gray-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="text-6xl mb-4">📤</div>
        <h3 className="text-xl font-bold text-white mb-2">
          엑셀 파일을 드래그하거나 클릭하여 업로드
        </h3>
        <p className="text-gray-400">
          .xlsx, .xls 형식의 엑셀 파일만 지원됩니다
        </p>
      </div>

      {/* 진행률 */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">업로드 중...</span>
            <span className="text-blue-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 안내 사항 */}
      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
        <h4 className="text-white font-bold mb-2">📋 엑셀 파일 형식 (영업정보시스템)</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• B열: 상품코드 (필수)</li>
          <li>• C열: 상품명</li>
          <li>• D열: 분류명 (카테고리)</li>
          <li>• E열: 거래처</li>
          <li>• K열: 판매단가</li>
          <li>• R열: 바코드</li>
          <li>• Z열: 초기재고</li>
        </ul>
        <p className="text-yellow-400 text-sm mt-3">
          ⚠️ 동일한 상품코드가 있으면 기존 데이터를 덮어씁니다.
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition disabled:opacity-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
