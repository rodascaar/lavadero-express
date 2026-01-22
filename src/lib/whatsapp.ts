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

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
    QR: 'QR',
    PAYMENT_LINK: 'Link de Pago',
};

export function generateWhatsAppUrl(
    whatsappNumber: string,
    booking: BookingData,
    businessName: string = 'AUTOSPA PREMIUM',
    welcomeMessage?: string,
    isProactive: boolean = false
): string {
    // Clean the destination number
    // If proactive, we send TO the customer. If not, customer sends TO business.
    const targetNumber = isProactive
        ? booking.customerPhone.replace(/\D/g, '')
        : whatsappNumber.replace(/\D/g, '');

    // Format the price
    const formattedPrice = new Intl.NumberFormat('es-PY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(booking.totalPrice);

    let message = "";

    if (isProactive) {
        message = `Hola ${booking.customerName}, soy de ${businessName}. Vemos que generaste una reserva para hoy a las ${booking.time}. Confirmamos que tu lugar está asegurado. ¿Podrías confirmar si llegas a tiempo?`;
    } else {
        // Build the standard ticket message
        message = `[ ${businessName.toUpperCase()} ]

RESERVA CONFIRMADA

ID   : ${booking.referenceCode}
----------------------------------
Nombre   : ${booking.customerName}
Contacto : ${booking.customerPhone}
Auto     : ${booking.plate}${booking.vehicleModel ? ` - ${booking.vehicleModel.toUpperCase()}` : ''}
----------------------------------
Fecha    : ${booking.date}
Hora     : ${booking.time}
Servicio : ${booking.serviceName}
Pago     : ${booking.paymentMethod}
----------------------------------
[ TOTAL : ${formattedPrice} Gs. ]

${welcomeMessage || 'Gracias por elegirnos.'}`;
    }

    // Encode for URL
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${targetNumber}?text=${encodedMessage}`;
}

export function generatePlainTicket(
    booking: BookingData,
    businessName: string = 'AUTOSPA PREMIUM'
): string {
    const formattedPrice = new Intl.NumberFormat('es-PY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(booking.totalPrice);

    return `[ ${businessName.toUpperCase()} ]
RESERVA CONFIRMADA
ID   : ${booking.referenceCode}
----------------------------------
Nombre   : ${booking.customerName}
Contacto : ${booking.customerPhone}
Auto     : ${booking.plate}${booking.vehicleModel ? ` - ${booking.vehicleModel.toUpperCase()}` : ''}
----------------------------------
Fecha    : ${booking.date}
Hora     : ${booking.time}
Servicio : ${booking.serviceName}
Pago     : ${booking.paymentMethod}
----------------------------------
[ TOTAL : ${formattedPrice} Gs. ]`;
}

export function generateReferenceCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LAV-${timestamp}-${random}`;
}
