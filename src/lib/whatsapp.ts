interface BookingData {
    referenceCode: string;
    customerName: string;
    customerPhone: string;
    plate: string;
    vehicleModel?: string;
    serviceName: string;
    date: string;
    time: string;
    paymentMethod: string;
    totalPrice: number;
    currency?: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: '💵 Efectivo',
    TRANSFER: '🏦 Transferencia',
    QR: '📱 QR',
    PAYMENT_LINK: '🔗 Link de Pago',
};

export function generateWhatsAppUrl(
    whatsappNumber: string,
    booking: BookingData,
    welcomeMessage?: string
): string {
    // Clean the phone number - remove all non-numeric except leading +
    let cleanNumber = whatsappNumber.replace(/[^\d+]/g, '');

    // If starts with +, keep it, otherwise add it
    if (!cleanNumber.startsWith('+')) {
        cleanNumber = '+' + cleanNumber;
    }

    // Remove the + for wa.me URL (it expects number without +)
    const numberForUrl = cleanNumber.replace('+', '');

    // Format the price
    const formattedPrice = new Intl.NumberFormat('es-PY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(booking.totalPrice);

    const currencySymbol = booking.currency === 'USD' ? '$' : '₲';

    // Build the ticket message
    const message = `🚗 *TICKET DE RESERVA* 🚗
━━━━━━━━━━━━━━━━━━━━━

📋 *Código:* ${booking.referenceCode}

👤 *Cliente:* ${booking.customerName}
📞 *Teléfono:* ${booking.customerPhone}
🚙 *Vehículo:* ${booking.plate}${booking.vehicleModel ? ` - ${booking.vehicleModel}` : ''}

✨ *Servicio:* ${booking.serviceName}
📅 *Fecha:* ${booking.date}
🕐 *Hora:* ${booking.time}

💰 *Total:* ${formattedPrice} ${currencySymbol}
${PAYMENT_METHOD_LABELS[booking.paymentMethod] || booking.paymentMethod}

━━━━━━━━━━━━━━━━━━━━━
${welcomeMessage || '¡Gracias por tu reserva!'}`;

    // Encode for URL - ensure proper encoding
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${numberForUrl}?text=${encodedMessage}`;
}

export function generateReferenceCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LAV-${timestamp}-${random}`;
}
