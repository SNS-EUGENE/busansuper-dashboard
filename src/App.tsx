import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Vendors from './pages/Vendors';
import InventoryChanges from './pages/InventoryChanges';
import Sales from './pages/Sales';
import Settlements from './pages/Settlements';
import Analysis from './pages/Analysis';
import { AlertProvider } from './contexts/AlertContext';

function App() {
  return (
    <AlertProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="inventory-changes" element={<InventoryChanges />} />
            <Route path="sales" element={<Sales />} />
            <Route path="settlements" element={<Settlements />} />
            <Route path="analysis" element={<Analysis />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AlertProvider>
  );
}

export default App;
