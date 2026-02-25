const toSafeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatAmount = (value) => `PKR ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const baseReceiptStyles = `
  body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; color: #111827; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 24px; color: #111827; }
  .header p { margin: 5px 0 0 0; font-size: 16px; color: #4b5563; }
  .shop-name { font-size: 18px; font-weight: bold; color: #1f3b8f; margin: 10px 0; }
  .order-info { margin-bottom: 20px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; }
  .order-info p { margin: 6px 0; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .items-table th, .items-table td { border: 1px solid #111827; padding: 8px; text-align: left; }
  .items-table th { background-color: #f3f4f6; font-weight: bold; }
  .items-table tbody tr:nth-child(even) { background-color: #f9fafb; }
  .total { font-weight: bold; background-color: #f3f4f6; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; margin-left: 6px; }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-partial { background: #ffedd5; color: #9a3412; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .amount-green { color: #15803d; font-weight: 700; }
  .amount-orange { color: #c2410c; font-weight: 700; }
  .amount-red { color: #b91c1c; font-weight: 700; }
  .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
`;

const wrapReceiptDocument = ({ title, shopName, receiptType, contentHtml }) => {
  return `
    <html>
      <head>
        <title>${toSafeString(title)}</title>
        <style>${baseReceiptStyles}</style>
      </head>
      <body>
        <div class="header">
          <h1>Ideal Nimko Ltd.</h1>
          <p>${toSafeString(receiptType)}</p>
          <div class="shop-name">For: ${toSafeString(shopName)}</div>
        </div>
        ${contentHtml}
      </body>
    </html>
  `;
};

const buildOrderPaymentStatusLabel = (status) => {
  if (status === 'paid') {
    return '<span class="badge badge-paid">Fully Paid</span>';
  }
  if (status === 'partial') {
    return '<span class="badge badge-partial">Partially Paid</span>';
  }
  return '<span class="badge badge-pending">Pending</span>';
};

export const buildOrderReceiptContentHtml = (order) => {
  const shopkeeperName = order?.shopkeeper?.name || 'N/A';
  const shopName = order?.shopkeeper?.shopName || shopkeeperName;
  const salesmanName = order?.placedBySalesman?.name || order?.salesman?.name || 'N/A';
  const paymentStatus = order?.paymentStatus || 'pending';
  const amountPaid = Number(order?.amountPaid || 0);
  const orderPending = Number(order?.pendingAmount || 0);
  const totalShopkeeperPending = Number(order?.shopkeeper?.pendingAmount || 0);
  const items = Array.isArray(order?.items) ? order.items : [];

  const itemsRows = items.map((item) => {
    const productName = item?.product?.name || item?.name || 'Product';
    return `
      <tr>
        <td>${toSafeString(productName)}</td>
        <td>${toSafeString(item?.quantity || 0)}</td>
        <td>${formatAmount(item?.unitPrice || 0)}</td>
        <td>${formatAmount(item?.totalPrice || 0)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="order-info">
      <p><strong>Order ID:</strong> ${toSafeString(order?._id || '-')}</p>
      <p><strong>Order Date:</strong> ${toSafeString(formatDateTime(order?.createdAt || order?.orderDate))}</p>
      <p><strong>Shop Name:</strong> ${toSafeString(shopName)}</p>
      <p><strong>Shopkeeper:</strong> ${toSafeString(shopkeeperName)}</p>
      <p><strong>Salesman:</strong> ${toSafeString(salesmanName)}</p>
      <p><strong>Delivery Address:</strong> ${toSafeString(order?.deliveryAddress || '')}</p>
      <p><strong>Payment Method:</strong> ${toSafeString(order?.paymentMethod || 'cash')}</p>
      <p><strong>Payment Status:</strong> ${buildOrderPaymentStatusLabel(paymentStatus)}</p>
      ${amountPaid > 0 ? `<p><strong>Amount Paid:</strong> <span class="amount-green">${formatAmount(amountPaid)}</span></p>` : ''}
      ${orderPending > 0 ? `<p><strong>Order Pending Amount:</strong> <span class="amount-orange">${formatAmount(orderPending)}</span></p>` : ''}
      ${totalShopkeeperPending > 0 ? `<p><strong>Shopkeeper Total Pending Amount:</strong> <span class="amount-red">${formatAmount(totalShopkeeperPending)}</span></p>` : ''}
      ${order?.notes ? `<p><strong>Notes:</strong> ${toSafeString(order.notes)}</p>` : ''}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Order Total:</td>
          <td>${formatAmount(order?.totalAmount || 0)}</td>
        </tr>
        ${amountPaid > 0 ? `
          <tr>
            <td colspan="3">Amount Paid:</td>
            <td class="amount-green">${formatAmount(amountPaid)}</td>
          </tr>
        ` : ''}
        ${orderPending > 0 ? `
          <tr>
            <td colspan="3">Pending from this order:</td>
            <td class="amount-orange">${formatAmount(orderPending)}</td>
          </tr>
        ` : ''}
      </tfoot>
    </table>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Generated on: ${toSafeString(formatDateTime(new Date()))}</p>
    </div>
  `;
};

export const buildOrderReceiptDocumentHtml = (order) => {
  const shopName = order?.shopkeeper?.shopName || order?.shopkeeper?.name || 'Shop';
  const contentHtml = buildOrderReceiptContentHtml(order);

  return wrapReceiptDocument({
    title: `Order Receipt - ${shopName}`,
    shopName,
    receiptType: 'Order Receipt',
    contentHtml
  });
};

export const buildRecoveryReceiptContentHtml = (recovery) => {
  const recoveryType = recovery?.recoveryType === 'payment_only' ? 'Payment Only' : 'Payment with Items';
  const items = Array.isArray(recovery?.items) ? recovery.items : [];

  const itemRows = items.map((item) => {
    const productName = item?.product?.name || item?.productName || 'Product';
    return `
      <tr>
        <td>${toSafeString(productName)}</td>
        <td>${toSafeString(item?.quantity || 0)}</td>
        <td>${formatAmount(item?.unitPrice || 0)}</td>
        <td>${formatAmount(item?.totalPrice || 0)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="order-info">
      <p><strong>Recovery ID:</strong> ${toSafeString(recovery?._id || '-')}</p>
      <p><strong>Recovery Date:</strong> ${toSafeString(formatDateTime(recovery?.recoveryDate || recovery?.createdAt))}</p>
      <p><strong>Shopkeeper:</strong> ${toSafeString(recovery?.shopkeeper?.name || 'Shopkeeper')}</p>
      <p><strong>Salesman:</strong> ${toSafeString(recovery?.salesman?.name || 'Salesman')}</p>
      <p><strong>Recovery Type:</strong> ${toSafeString(recoveryType)}</p>
      <p><strong>Payment Method:</strong> ${toSafeString(recovery?.paymentMethod || 'cash')}</p>
      ${recovery?.recoveryLocation ? `<p><strong>Location:</strong> ${toSafeString(recovery.recoveryLocation)}</p>` : ''}
      ${recovery?.receiptNumber ? `<p><strong>Receipt Number:</strong> ${toSafeString(recovery.receiptNumber)}</p>` : ''}
      ${recovery?.notes ? `<p><strong>Notes:</strong> ${toSafeString(recovery.notes)}</p>` : ''}
    </div>

    ${recovery?.recoveryType === 'payment_with_items' && items.length > 0 ? `
      <table class="items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Items Total:</td>
            <td>${formatAmount(recovery?.itemsValue || 0)}</td>
          </tr>
        </tfoot>
      </table>
    ` : ''}

    <table class="items-table">
      <tbody>
        <tr>
          <td><strong>Amount Collected:</strong></td>
          <td><strong>${formatAmount(recovery?.amountCollected || 0)}</strong></td>
        </tr>
        ${recovery?.recoveryType === 'payment_with_items' ? `
          <tr>
            <td>Items Value:</td>
            <td>${formatAmount(recovery?.itemsValue || 0)}</td>
          </tr>
        ` : ''}
        <tr>
          <td>Previous Pending Amount:</td>
          <td>${formatAmount(recovery?.previousPendingAmount || 0)}</td>
        </tr>
        <tr class="total">
          <td><strong>Net Payment:</strong></td>
          <td><strong>${formatAmount(recovery?.netPayment || 0)}</strong></td>
        </tr>
        <tr class="total">
          <td><strong>New Pending Amount:</strong></td>
          <td><strong>${formatAmount(recovery?.newPendingAmount || 0)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Generated on: ${toSafeString(formatDateTime(new Date()))}</p>
    </div>
  `;
};

export const buildRecoveryReceiptDocumentHtml = (recovery) => {
  const shopName = recovery?.shopkeeper?.name || 'Shopkeeper';
  const contentHtml = buildRecoveryReceiptContentHtml(recovery);

  return wrapReceiptDocument({
    title: `Recovery Receipt - ${shopName}`,
    shopName,
    receiptType: 'Recovery Receipt',
    contentHtml
  });
};
