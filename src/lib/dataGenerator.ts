import type { Product, Category, Brand, Unit, Supplier, Customer, Sale, SaleItem, Purchase, PurchaseItem, Expense, ReturnRecord, ReturnItem, User } from '@/types';
import { generateId, generateInvoiceNumber, generatePONumber, generateReturnNumber } from './utils';

const now = new Date().toISOString();

// Users
const users: User[] = [
  { id: generateId(), name: 'Admin User', email: 'admin@alimobiles.com', password: 'admin123', role: 'admin', status: 'active', lastLogin: now, createdAt: now },
  { id: generateId(), name: 'Manager', email: 'manager@alimobiles.com', password: 'manager123', role: 'manager', status: 'active', lastLogin: now, createdAt: now },
  { id: generateId(), name: 'Cashier', email: 'cashier@alimobiles.com', password: 'cashier123', role: 'cashier', status: 'active', lastLogin: now, createdAt: now },
];

// Categories
const categories: Category[] = [
  { id: 'cat_1', name: 'Mobiles', description: 'Smartphones and mobile phones', displayOrder: 1, status: 'active', showInPos: true, createdAt: now },
  { id: 'cat_2', name: 'Accessories', description: 'Phone accessories', displayOrder: 2, status: 'active', showInPos: true, createdAt: now },
  { id: 'cat_3', name: 'Tablets', description: 'Tablet devices', displayOrder: 3, status: 'active', showInPos: true, createdAt: now },
  { id: 'cat_4', name: 'Spare Parts', description: 'Mobile spare parts', displayOrder: 4, status: 'active', showInPos: true, createdAt: now },
  { id: 'cat_5', name: 'Cards', description: 'SIM cards and memory cards', displayOrder: 5, status: 'active', showInPos: true, createdAt: now },
  { id: 'cat_6', name: 'Chargers', description: 'Chargers and cables', displayOrder: 6, status: 'active', showInPos: true, createdAt: now },
];

// Brands
const brands: Brand[] = [
  { id: 'brand_1', name: 'Apple', description: 'Premium smartphones', status: 'active', createdAt: now },
  { id: 'brand_2', name: 'Samsung', description: 'Android smartphones', status: 'active', createdAt: now },
  { id: 'brand_3', name: 'Xiaomi', description: 'Value smartphones', status: 'active', createdAt: now },
  { id: 'brand_4', name: 'Huawei', description: 'Chinese smartphones', status: 'active', createdAt: now },
  { id: 'brand_5', name: 'OPPO', description: 'Camera focused phones', status: 'active', createdAt: now },
  { id: 'brand_6', name: 'Vivo', description: 'Music focused phones', status: 'active', createdAt: now },
  { id: 'brand_7', name: 'Realme', description: 'Budget smartphones', status: 'active', createdAt: now },
  { id: 'brand_8', name: 'Infinix', description: 'Affordable smartphones', status: 'active', createdAt: now },
];

// Units
const units: Unit[] = [
  { id: 'unit_1', name: 'Piece', code: 'pc', description: 'Single item', status: 'active' },
  { id: 'unit_2', name: 'Box', code: 'box', description: 'Box of items', status: 'active' },
  { id: 'unit_3', name: 'Set', code: 'set', description: 'Complete set', status: 'active' },
  { id: 'unit_4', name: 'Meter', code: 'm', description: 'Length in meters', status: 'active' },
  { id: 'unit_5', name: 'Kilogram', code: 'kg', description: 'Weight in kg', status: 'active' },
];

// Products
const products: Product[] = [
  { id: 'prod_1', name: 'iPhone 14 Pro Max', sku: 'APL-14PM-001', barcode: '123456789012', categoryId: 'cat_1', brandId: 'brand_1', description: '6.7-inch Super Retina XDR display', costPrice: 320000, salePrice: 385000, stockQuantity: 8, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_2', name: 'iPhone 14 Pro', sku: 'APL-14P-002', barcode: '123456789013', categoryId: 'cat_1', brandId: 'brand_1', description: '6.1-inch Super Retina XDR display', costPrice: 280000, salePrice: 345000, stockQuantity: 5, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_3', name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-001', barcode: '123456789014', categoryId: 'cat_1', brandId: 'brand_2', description: '6.8-inch Dynamic AMOLED 2X', costPrice: 290000, salePrice: 350000, stockQuantity: 12, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_4', name: 'Samsung Galaxy A54', sku: 'SAM-A54-001', barcode: '123456789015', categoryId: 'cat_1', brandId: 'brand_2', description: '6.4-inch Super AMOLED', costPrice: 75000, salePrice: 95000, stockQuantity: 20, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_5', name: 'Xiaomi Redmi Note 12', sku: 'XIA-RN12-001', barcode: '123456789016', categoryId: 'cat_1', brandId: 'brand_3', description: '6.67-inch AMOLED display', costPrice: 42000, salePrice: 55000, stockQuantity: 25, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_6', name: 'Xiaomi 13 Pro', sku: 'XIA-13P-001', barcode: '123456789017', categoryId: 'cat_1', brandId: 'brand_3', description: '6.73-inch LTPO AMOLED', costPrice: 180000, salePrice: 220000, stockQuantity: 6, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_7', name: 'OPPO Reno 8 Pro', sku: 'OPP-R8P-001', barcode: '123456789018', categoryId: 'cat_1', brandId: 'brand_5', description: '6.7-inch AMOLED display', costPrice: 85000, salePrice: 105000, stockQuantity: 10, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_8', name: 'Vivo V27 Pro', sku: 'VIV-V27P-001', barcode: '123456789019', categoryId: 'cat_1', brandId: 'brand_6', description: '6.78-inch AMOLED display', costPrice: 72000, salePrice: 92000, stockQuantity: 15, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_9', name: 'Infinix Zero 30', sku: 'INF-Z30-001', barcode: '123456789020', categoryId: 'cat_1', brandId: 'brand_8', description: '6.78-inch AMOLED 144Hz', costPrice: 48000, salePrice: 65000, stockQuantity: 18, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_10', name: 'Realme GT Neo 5', sku: 'RLM-GTN5-001', barcode: '123456789021', categoryId: 'cat_1', brandId: 'brand_7', description: '6.74-inch AMOLED 144Hz', costPrice: 95000, salePrice: 120000, stockQuantity: 7, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_11', name: 'USB-C Cable', sku: 'ACC-USB-001', barcode: '123456789022', categoryId: 'cat_2', brandId: 'brand_3', description: 'Fast charging USB-C cable 1m', costPrice: 150, salePrice: 350, stockQuantity: 150, minStockLevel: 20, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_12', name: 'Wireless Earbuds', sku: 'ACC-WEB-001', barcode: '123456789023', categoryId: 'cat_2', brandId: 'brand_2', description: 'Bluetooth 5.3 wireless earbuds', costPrice: 1800, salePrice: 3500, stockQuantity: 45, minStockLevel: 10, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_13', name: 'Phone Case - Silicone', sku: 'ACC-CSE-001', barcode: '123456789024', categoryId: 'cat_2', brandId: 'brand_1', description: 'Premium silicone case', costPrice: 300, salePrice: 800, stockQuantity: 80, minStockLevel: 15, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_14', name: 'Screen Protector', sku: 'ACC-SCR-001', barcode: '123456789025', categoryId: 'cat_2', brandId: 'brand_3', description: 'Tempered glass screen protector', costPrice: 100, salePrice: 300, stockQuantity: 200, minStockLevel: 30, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_15', name: 'Power Bank 20000mAh', sku: 'ACC-PWB-001', barcode: '123456789026', categoryId: 'cat_2', brandId: 'brand_3', description: '20000mAh fast charging power bank', costPrice: 2200, salePrice: 4000, stockQuantity: 30, minStockLevel: 8, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_16', name: 'Samsung Galaxy Tab S9', sku: 'SAM-TBS9-001', barcode: '123456789027', categoryId: 'cat_3', brandId: 'brand_2', description: '11-inch Dynamic AMOLED 2X', costPrice: 160000, salePrice: 195000, stockQuantity: 4, minStockLevel: 2, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_17', name: 'iPad Air 5', sku: 'APL-IPA5-001', barcode: '123456789028', categoryId: 'cat_3', brandId: 'brand_1', description: '10.9-inch Liquid Retina display', costPrice: 130000, salePrice: 165000, stockQuantity: 3, minStockLevel: 2, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_18', name: 'LCD Screen - iPhone 14', sku: 'SP-LCD-001', barcode: '123456789029', categoryId: 'cat_4', brandId: 'brand_1', description: 'Original LCD replacement', costPrice: 15000, salePrice: 25000, stockQuantity: 12, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_19', name: 'Battery - Samsung', sku: 'SP-BAT-001', barcode: '123456789030', categoryId: 'cat_4', brandId: 'brand_2', description: 'Original Samsung battery', costPrice: 2000, salePrice: 4000, stockQuantity: 25, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_20', name: 'Charging Port', sku: 'SP-CHP-001', barcode: '123456789031', categoryId: 'cat_4', brandId: 'brand_3', description: 'USB-C charging port', costPrice: 500, salePrice: 1200, stockQuantity: 40, minStockLevel: 10, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_21', name: 'Jazz SIM Card', sku: 'CRD-JAZ-001', barcode: '123456789032', categoryId: 'cat_5', brandId: 'brand_3', description: 'Jazz prepaid SIM', costPrice: 50, salePrice: 100, stockQuantity: 100, minStockLevel: 20, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_22', name: 'Telenor SIM Card', sku: 'CRD-TEL-001', barcode: '123456789033', categoryId: 'cat_5', brandId: 'brand_3', description: 'Telenor prepaid SIM', costPrice: 50, salePrice: 100, stockQuantity: 100, minStockLevel: 20, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_23', name: 'Zong SIM Card', sku: 'CRD-ZON-001', barcode: '123456789034', categoryId: 'cat_5', brandId: 'brand_3', description: 'Zong prepaid SIM', costPrice: 50, salePrice: 100, stockQuantity: 100, minStockLevel: 20, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_24', name: '65W Fast Charger', sku: 'CHR-65W-001', barcode: '123456789035', categoryId: 'cat_6', brandId: 'brand_3', description: '65W GaN fast charger', costPrice: 1500, salePrice: 3000, stockQuantity: 35, minStockLevel: 8, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_25', name: 'Wireless Charger Pad', sku: 'CHR-WCP-001', barcode: '123456789036', categoryId: 'cat_6', brandId: 'brand_2', description: '15W wireless charging pad', costPrice: 800, salePrice: 1800, stockQuantity: 20, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_26', name: 'Car Charger Dual USB', sku: 'CHR-CCR-001', barcode: '123456789037', categoryId: 'cat_6', brandId: 'brand_3', description: 'Dual USB car charger 3.4A', costPrice: 250, salePrice: 600, stockQuantity: 50, minStockLevel: 10, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_27', name: 'Samsung Galaxy A34', sku: 'SAM-A34-001', barcode: '123456789038', categoryId: 'cat_1', brandId: 'brand_2', description: '6.6-inch Super AMOLED', costPrice: 55000, salePrice: 72000, stockQuantity: 2, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_28', name: 'Huawei P60 Pro', sku: 'HUA-P60P-001', barcode: '123456789039', categoryId: 'cat_1', brandId: 'brand_4', description: '6.67-inch LTPO OLED', costPrice: 140000, salePrice: 175000, stockQuantity: 0, minStockLevel: 3, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_29', name: 'Memory Card 128GB', sku: 'ACC-MEM-001', barcode: '123456789040', categoryId: 'cat_2', brandId: 'brand_2', description: '128GB microSD card', costPrice: 800, salePrice: 1800, stockQuantity: 60, minStockLevel: 10, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
  { id: 'prod_30', name: 'Bluetooth Speaker', sku: 'ACC-BTS-001', barcode: '123456789041', categoryId: 'cat_2', brandId: 'brand_3', description: 'Portable Bluetooth speaker', costPrice: 1200, salePrice: 2800, stockQuantity: 22, minStockLevel: 5, unitId: 'unit_1', status: 'active', condition: 'new', showInPos: true, createdAt: now, updatedAt: now },
];

// Suppliers
const suppliers: Supplier[] = [
  { id: 'sup_1', name: 'TechZone Distributors', contactPerson: 'Ahmed Khan', phone: '+92-300-1234567', email: 'ahmed@techzone.pk', address: 'Shop 45, Saddar Market', city: 'Karachi', country: 'Pakistan', businessType: 'Distributor', status: 'active', createdAt: now },
  { id: 'sup_2', name: 'MobileHub Pakistan', contactPerson: 'Ali Raza', phone: '+92-301-2345678', email: 'ali@mobilehub.pk', address: 'Block 7, Electronics Market', city: 'Lahore', country: 'Pakistan', businessType: 'Wholesaler', status: 'active', createdAt: now },
  { id: 'sup_3', name: 'SmartParts Co.', contactPerson: 'Bilal Ahmed', phone: '+92-302-3456789', email: 'bilal@smartparts.pk', address: 'Plaza 12, Hafeez Center', city: 'Lahore', country: 'Pakistan', businessType: 'Manufacturer', status: 'active', createdAt: now },
  { id: 'sup_4', name: 'Global Gadgets', contactPerson: 'Usman Farooq', phone: '+92-303-4567890', email: 'usman@globalgadgets.pk', address: 'Suite 8, Gulf Center', city: 'Karachi', country: 'Pakistan', businessType: 'Distributor', status: 'active', createdAt: now },
  { id: 'sup_5', name: 'Digital World Ltd', contactPerson: 'Samiullah', phone: '+92-304-5678901', email: 'sami@digitalworld.pk', address: 'Shop 102, Regal Market', city: 'Islamabad', country: 'Pakistan', businessType: 'Wholesaler', status: 'active', createdAt: now },
];

// Customers
const customerNames = ['Walk-in Customer', 'Muhammad Ali', 'Fatima Hassan', 'Ahmad Raza', 'Sana Khan', 'Imran Sheikh', 'Ayesha Malik', 'Omar Farooq', 'Zara Ahmed', 'Bilal Hussain', 'Nadia Iqbal', 'Kamran Shah', 'Sadia Rehman', 'Tariq Mehmood', 'Rabia Aslam', 'Faisal Qureshi', 'Mariam Nawaz', 'Shahid Afridi', 'Hina Tariq', 'Waqar Younis', 'Saima Akhtar', 'Javed Iqbal', 'Noreen Begum', 'Asif Ali', 'Lubna Sharif', 'Adnan Siddiqui', 'Yasmin Bano', 'Rehan Ahmed', 'Farah Naz', 'Tanveer Abbas'];

const customers: Customer[] = customerNames.map((name, i) => ({
  id: `cust_${i + 1}`,
  name,
  phone: `+92-3${i % 10}0-${1000000 + i * 1234}`,
  email: name !== 'Walk-in Customer' ? `${name.toLowerCase().replace(/\s/g, '.')}@email.com` : undefined,
  address: i > 0 ? `House ${i * 10}, Street ${i}, Karachi` : undefined,
  city: 'Karachi',
  status: 'active' as const,
  createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
}));

// Generate Sales
function generateSales(): Sale[] {
  const sales: Sale[] = [];
  const paymentMethods: Array<'cash' | 'card' | 'bank_transfer' | 'credit'> = ['cash', 'card', 'bank_transfer', 'credit'];
  
  for (let i = 0; i < 80; i++) {
    const numItems = Math.floor(Math.random() * 4) + 1;
    const items: SaleItem[] = [];
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const total = product.salePrice * qty;
      subtotal += total;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.salePrice,
        total,
      });
    }
    
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0;
    const tax = Math.round((subtotal - discount) * 0.18);
    const grandTotal = subtotal - discount + tax;
    const paidAmount = Math.random() > 0.15 ? grandTotal : Math.round(grandTotal * 0.5);
    const changeDue = paidAmount > grandTotal ? paidAmount - grandTotal : 0;
    
    let status: 'paid' | 'pending' | 'partial' | 'cancelled' = 'paid';
    if (paidAmount === 0) status = 'pending';
    else if (paidAmount < grandTotal) status = 'partial';
    else if (Math.random() > 0.95) status = 'cancelled';
    
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const daysAgo = Math.floor(Math.random() * 60);
    
    sales.push({
      id: `sale_${i + 1}`,
      invoiceNumber: generateInvoiceNumber(),
      customerId: customer.id,
      customerName: customer.name,
      items,
      subtotal,
      discount,
      tax,
      grandTotal,
      paidAmount,
      changeDue,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      status,
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin',
    });
  }
  
  return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Generate Purchases
function generatePurchases(): Purchase[] {
  const purchases: Purchase[] = [];
  
  for (let i = 0; i < 20; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const numItems = Math.floor(Math.random() * 5) + 1;
    const items: PurchaseItem[] = [];
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 10) + 5;
      const unitCost = Math.round(product.costPrice * 0.9);
      const total = unitCost * qty;
      subtotal += total;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitCost,
        total,
      });
    }
    
    const tax = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + tax;
    const paidAmount = Math.random() > 0.3 ? grandTotal : Math.round(grandTotal * 0.5);
    
    let status: 'pending' | 'received' | 'partial' | 'cancelled' = 'received';
    if (paidAmount < grandTotal) status = 'partial';
    else if (Math.random() > 0.9) status = 'pending';
    
    purchases.push({
      id: `pur_${i + 1}`,
      poNumber: generatePONumber(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items,
      subtotal,
      tax,
      discount: 0,
      shipping: Math.round(Math.random() * 1000),
      grandTotal,
      paidAmount,
      status,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Generate Returns
function generateReturns(sales: Sale[]): ReturnRecord[] {
  const returns: ReturnRecord[] = [];
  const reasons = ['Defective', 'Damaged', 'Wrong Item', 'Customer Changed Mind', 'Other'];
  
  for (let i = 0; i < 10; i++) {
    const sale = sales[Math.floor(Math.random() * Math.min(sales.length, 30))];
    if (!sale || sale.items.length === 0) continue;
    
    const returnItems: ReturnItem[] = sale.items.slice(0, Math.min(2, sale.items.length)).map(item => ({
      productId: item.productId,
      productName: item.productName,
      originalQuantity: item.quantity,
      returnQuantity: 1,
      unitPrice: item.unitPrice,
      total: item.unitPrice,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
    }));
    
    const refundAmount = returnItems.reduce((sum, item) => sum + item.total, 0);
    const restockingFee = Math.round(refundAmount * 0.05);
    
    returns.push({
      id: `ret_${i + 1}`,
      returnNumber: generateReturnNumber(),
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      items: returnItems,
      refundAmount,
      restockingFee,
      finalRefund: refundAmount - restockingFee,
      refundMethod: 'cash',
      status: 'completed',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return returns;
}

// Generate Expenses
function generateExpenses(): Expense[] {
  const expenseCategories = ['Rent', 'Salary', 'Utilities', 'Maintenance', 'Marketing', 'Transportation', 'Miscellaneous'];
  const descriptions: Record<string, string[]> = {
    'Rent': ['Monthly shop rent', 'Warehouse rent', 'Office space rent'],
    'Salary': ['Staff salary - June', 'Manager salary', 'Salesman salary'],
    'Utilities': ['Electricity bill', 'Internet bill', 'Water bill'],
    'Maintenance': ['AC repair', 'Display repair', 'Generator service'],
    'Marketing': ['Social media ads', 'Banner printing', 'Flyer distribution'],
    'Transportation': ['Courier charges', 'Delivery fuel', 'Business travel'],
    'Miscellaneous': ['Stationery', 'Tea & refreshments', 'Misc expenses'],
  };
  
  const expenses: Expense[] = [];
  
  for (let i = 0; i < 30; i++) {
    const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    const descList = descriptions[category];
    const description = descList[Math.floor(Math.random() * descList.length)];
    
    expenses.push({
      id: `exp_${i + 1}`,
      date: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
      category,
      description,
      amount: Math.floor(Math.random() * 50000) + 1000,
      paymentMethod: ['cash', 'card', 'bank_transfer'][Math.floor(Math.random() * 3)] as 'cash' | 'card' | 'bank_transfer',
      createdAt: now,
    });
  }
  
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Settings
const shopSettings = {
  shopName: 'Ali Mobiles',
  address: 'Shop #45, Mobile Market, Saddar, Karachi',
  phone: '+92-21-35671234',
  email: 'info@alimobiles.pk',
  currency: 'PKR',
  dateFormat: 'dd/MM/yyyy',
};

const receiptSettings = {
  header: 'Ali Mobiles\nShop #45, Mobile Market, Saddar, Karachi\nPhone: +92-21-35671234',
  footer: 'Thank you for shopping with us!\nReturns accepted within 7 days with receipt.',
  showLogo: true,
  receiptWidth: '80mm' as const,
  invoicePrefix: 'INV',
  startingNumber: 1,
  showTaxBreakdown: true,
};

const taxSettings = {
  enabled: true,
  name: 'GST',
  rate: 18,
  includedInPrice: false,
};

export function initializeDemoData() {
  if (!localStorage.getItem('pos_users')) {
    localStorage.setItem('pos_users', JSON.stringify(users));
  }
  if (!localStorage.getItem('pos_categories')) {
    localStorage.setItem('pos_categories', JSON.stringify(categories));
  }
  if (!localStorage.getItem('pos_brands')) {
    localStorage.setItem('pos_brands', JSON.stringify(brands));
  }
  if (!localStorage.getItem('pos_units')) {
    localStorage.setItem('pos_units', JSON.stringify(units));
  }
  if (!localStorage.getItem('pos_products')) {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }
  if (!localStorage.getItem('pos_suppliers')) {
    localStorage.setItem('pos_suppliers', JSON.stringify(suppliers));
  }
  if (!localStorage.getItem('pos_customers')) {
    localStorage.setItem('pos_customers', JSON.stringify(customers));
  }
  if (!localStorage.getItem('pos_settings')) {
    localStorage.setItem('pos_settings', JSON.stringify(shopSettings));
  }
  if (!localStorage.getItem('pos_receipt_settings')) {
    localStorage.setItem('pos_receipt_settings', JSON.stringify(receiptSettings));
  }
  if (!localStorage.getItem('pos_tax_settings')) {
    localStorage.setItem('pos_tax_settings', JSON.stringify(taxSettings));
  }
  
  const sales = generateSales();
  localStorage.setItem('pos_sales', JSON.stringify(sales));
  
  const purchases = generatePurchases();
  localStorage.setItem('pos_purchases', JSON.stringify(purchases));
  
  const returns = generateReturns(sales);
  localStorage.setItem('pos_returns', JSON.stringify(returns));
  
  const expenses = generateExpenses();
  localStorage.setItem('pos_expenses', JSON.stringify(expenses));
}
