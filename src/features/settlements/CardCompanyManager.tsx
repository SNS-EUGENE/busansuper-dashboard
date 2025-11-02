import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface CardCompany {
  id: string;
  name: string;
  fee_rate: number;
  created_at: string;
}

export default function CardCompanyManager() {
  const { showAlert, showConfirm } = useAlert();
  const [companies, setCompanies] = useState<CardCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: '', fee_rate: 0 });
  const [isAdding, setIsAdding] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', fee_rate: 3.0 });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('card_companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('카드사 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCompany.name.trim()) {
      showAlert('카드사명을 입력해주세요.', 'warning');
      return;
    }

    try {
      const { error } = await supabase.from('card_companies').insert([
        {
          name: newCompany.name.trim(),
          fee_rate: newCompany.fee_rate,
        },
      ]);

      if (error) throw error;

      showAlert('카드사가 추가되었습니다!', 'success');
      setIsAdding(false);
      setNewCompany({ name: '', fee_rate: 3.0 });
      loadCompanies();
    } catch (error: any) {
      console.error('카드사 추가 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
    }
  };

  const handleEdit = (company: CardCompany) => {
    setEditingId(company.id);
    setEditValue({ name: company.name, fee_rate: company.fee_rate });
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('card_companies')
        .update({
          name: editValue.name.trim(),
          fee_rate: editValue.fee_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      showAlert('카드사 정보가 수정되었습니다!', 'success');
      setEditingId(null);
      loadCompanies();
    } catch (error: any) {
      console.error('카드사 수정 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showConfirm(`"${name}" 카드사를 삭제하시겠습니까?`, async () => {
      try {
        const { error } = await supabase.from('card_companies').delete().eq('id', id);

        if (error) throw error;

        showAlert('카드사가 삭제되었습니다.', 'success');
        loadCompanies();
      } catch (error: any) {
        console.error('카드사 삭제 실패:', error);
        showAlert(`오류: ${error.message}`, 'error');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">카드사(매입사) 관리</h3>
          <p className="text-gray-400 text-sm mt-1">
            영수증 업로드 시 자동 등록되며, 수수료율을 설정할 수 있습니다
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-sm"
        >
          ➕ 카드사 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {isAdding && (
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">카드사명</label>
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="w-full bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="예: 신한카드"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">수수료율 (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={newCompany.fee_rate}
                onChange={(e) => setNewCompany({ ...newCompany, fee_rate: Number(e.target.value) })}
                className="w-full bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewCompany({ name: '', fee_rate: 3.0 });
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* 카드사 목록 */}
      {companies.length === 0 ? (
        <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
          <p className="text-gray-400">등록된 카드사가 없습니다</p>
          <p className="text-gray-500 text-sm mt-1">영수증 업로드 시 자동으로 등록됩니다</p>
        </div>
      ) : (
        <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-300">카드사명</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">
                  수수료율 (%)
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-600/50 transition">
                  <td className="px-4 py-3">
                    {editingId === company.id ? (
                      <input
                        type="text"
                        value={editValue.name}
                        onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                        className="w-full bg-gray-600 border border-gray-500 text-white px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-white font-medium">{company.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === company.id ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={editValue.fee_rate}
                        onChange={(e) =>
                          setEditValue({ ...editValue, fee_rate: Number(e.target.value) })
                        }
                        className="w-24 bg-gray-600 border border-gray-500 text-white px-2 py-1 rounded focus:outline-none focus:border-blue-500 text-center"
                      />
                    ) : (
                      <span className="text-white">{company.fee_rate}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === company.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleSave(company.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(company)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(company.id, company.name)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
