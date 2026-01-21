import React, { useState, useEffect } from 'react';

interface Service {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration: number;
}

interface Settings {
    businessName: string;
    whatsappNumber: string;
    openTime: string;
    closeTime: string;
    slotDuration: number;
    workingDays: number[];
    welcomeMessage: string;
    currency: string;
}

interface BookingWidgetProps {
    services: Service[];
    settings: Settings;
}

interface FormData {
    name: string;
    phone: string;
    plate: string;
    model: string;
    paymentMethod: string;
}

type Step = 'service' | 'datetime' | 'form' | 'confirm';

// Payment method labels
const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: '💵 Efectivo',
    TRANSFER: '🏦 Transferencia',
    QR: '📱 QR',
    PAYMENT_LINK: '🔗 Link de Pago',
};

// Generate reference code
function generateReferenceCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LAV-${timestamp}-${random}`;
}

// Generate WhatsApp URL
function generateWhatsAppUrl(
    whatsappNumber: string,
    booking: {
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
    },
    welcomeMessage?: string
): string {
    // Cleaner phone logic
    const phone = booking.customerPhone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('595') ? '+' + phone : (phone.startsWith('09') ? '+595' + phone.substring(1) : (phone.startsWith('9') ? '+595' + phone : '+' + phone));
    const numberForUrl = formattedPhone.replace('+', '');

    const formattedPrice = new Intl.NumberFormat('es-PY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(booking.totalPrice);

    const currencySymbol = booking.currency === 'USD' ? '$' : '₲';

    const message = `🚗 *TICKET DE RESERVA* 🚗
━━━━━━━━━━━━━━━━━━━━━

📋 *Código:* ${booking.referenceCode}

👤 *Cliente:* ${booking.customerName}
📞 *Teléfono:* ${formattedPhone}
🚙 *Vehículo:* ${booking.plate}${booking.vehicleModel ? ` - ${booking.vehicleModel}` : ''}

✨ *Servicio:* ${booking.serviceName}
📅 *Fecha:* ${booking.date}
🕐 *Hora:* ${booking.time}

💰 *Total:* ${formattedPrice} ${currencySymbol}
${PAYMENT_METHOD_LABELS[booking.paymentMethod] || booking.paymentMethod}

━━━━━━━━━━━━━━━━━━━━━
${welcomeMessage || '¡Gracias por tu reserva!'}`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${numberForUrl}?text=${encodedMessage}`;
}

// Phone validation helper
function isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 9;
}

// Helper to format phone for storage (E.164-ish)
function formatPhoneForStorage(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    // Handle Py 09xx
    if (cleaned.startsWith('09')) {
        cleaned = '595' + cleaned.substring(1);
    }
    // Handle Py 9xx
    else if (cleaned.startsWith('9')) {
        cleaned = '595' + cleaned;
    }

    // Ensure +
    return '+' + cleaned;
}

export function BookingWidget({ services, settings }: BookingWidgetProps) {
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<Step>('service');
    const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone: '',
        plate: '',
        model: '',
        paymentMethod: 'CASH',
    });

    // Reset time when date changes
    useEffect(() => {
        if (selectedDate) {
            setSelectedTime(null);
            fetchAvailability(selectedDate);
        }
    }, [selectedDate]);

    const fetchAvailability = async (date: Date) => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const response = await fetch(`/api/availability?date=${dateStr}`);
            if (response.ok) {
                const data = await response.json();
                setUnavailableSlots(data.unavailableSlots || []);
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarDays = () => {
        const days: Date[] = [];
        const today = new Date();
        const current = new Date(today);
        let count = 0;
        let safety = 0;

        while (count < 14 && safety < 60) {
            if (settings.workingDays.includes(current.getDay())) {
                days.push(new Date(current));
                count++;
            }
            current.setDate(current.getDate() + 1);
            safety++;
        }
        return days;
    };

    const generateTimeSlots = () => {
        const slots: string[] = [];
        if (!settings.openTime || !settings.closeTime) return slots;

        const [startHour, startMinute] = settings.openTime.split(':').map(Number);
        const [endHour, endMinute] = settings.closeTime.split(':').map(Number);

        const current = new Date();
        current.setHours(startHour, startMinute, 0, 0);

        const end = new Date();
        end.setHours(endHour, endMinute, 0, 0);

        while (current < end) {
            slots.push(
                current.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                })
            );
            current.setMinutes(current.getMinutes() + settings.slotDuration);
        }
        return slots;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatDateLong = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const handleSubmit = async () => {
        if (!selectedService || !selectedDate || !selectedTime) return;

        setLoading(true);

        try {
            const referenceCode = generateReferenceCode();
            const dateStr = selectedDate.toISOString().split('T')[0];

            // Format phone consistently
            const formattedPhone = formatPhoneForStorage(formData.phone);

            // Create booking via API
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referenceCode,
                    date: dateStr,
                    time: selectedTime,
                    serviceId: selectedService.id,
                    paymentMethod: formData.paymentMethod,
                    customer: {
                        name: formData.name.trim(),
                        phone: formattedPhone,
                        plate: formData.plate.toUpperCase(),
                        model: formData.model,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear la reserva');
            }

            // Generate WhatsApp URL and redirect
            const whatsappUrl = generateWhatsAppUrl(settings.whatsappNumber, {
                referenceCode,
                customerName: formData.name,
                customerPhone: formData.phone,
                plate: formData.plate.toUpperCase(),
                vehicleModel: formData.model,
                serviceName: selectedService.name,
                date: formatDateLong(selectedDate),
                time: selectedTime,
                paymentMethod: formData.paymentMethod,
                totalPrice: selectedService.price,
                currency: settings.currency,
            }, settings.welcomeMessage);

            // Redirect to WhatsApp
            window.open(whatsappUrl, '_blank');

            // Reset form
            setStep('service');
            setSelectedService(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setFormData({ name: '', phone: '', plate: '', model: '', paymentMethod: 'CASH' });

        } catch (error: any) {
            console.error('Error:', error);
            alert(error.message || 'Hubo un error al procesar tu reserva. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const allTimeSlots = generateTimeSlots();

    return (
        <div className="max-w-3xl mx-auto px-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
                {['service', 'datetime', 'form', 'confirm'].map((s, i) => (
                    <React.Fragment key={s}>
                        <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all ${step === s
                                ? 'bg-primary-600 text-white scale-110 shadow-lg shadow-primary-500/30'
                                : ['service', 'datetime', 'form', 'confirm'].indexOf(step) > i
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                        >
                            {['service', 'datetime', 'form', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
                        </div>
                        {i < 3 && (
                            <div className={`w-8 sm:w-12 h-1 rounded ${['service', 'datetime', 'form', 'confirm'].indexOf(step) > i
                                ? 'bg-emerald-500'
                                : 'bg-slate-200'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Select Service */}
            {step === 'service' && (
                <div className="animate-fade-in">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 text-center">
                        ¿Qué servicio necesitas?
                    </h3>
                    <div className="grid gap-4">
                        {services.map((service, index) => {
                            const colors = [
                                { bg: 'from-blue-500 to-cyan-500', light: 'bg-blue-50', icon: '💧' },
                                { bg: 'from-purple-500 to-pink-500', light: 'bg-purple-50', icon: '✨' },
                                { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', icon: '👑' },
                                { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50', icon: '🧹' },
                                { bg: 'from-rose-500 to-red-500', light: 'bg-rose-50', icon: '🌟' },
                            ];
                            const color = colors[index % colors.length];

                            return (
                                <button
                                    key={service.id}
                                    onClick={() => {
                                        setSelectedService(service);
                                        setStep('datetime');
                                    }}
                                    className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${selectedService?.id === service.id
                                        ? 'border-primary-500 shadow-lg'
                                        : 'border-transparent bg-white shadow-md'
                                        }`}
                                >
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color.bg} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />

                                    <div className="flex items-start gap-4 relative">
                                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${color.light} flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0`}>
                                            {color.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg sm:text-xl text-slate-900">{service.name}</h4>
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{service.description}</p>
                                            <div className="flex items-center gap-3 mt-3">
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                    ⏱️ {service.duration} min
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                                                {new Intl.NumberFormat('es-PY').format(service.price)}
                                            </span>
                                            <span className="text-slate-500 text-sm ml-1">₲</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Step 2: Select Date & Time */}
            {step === 'datetime' && (
                <div className="animate-fade-in">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 text-center">
                        Selecciona fecha y hora
                    </h3>

                    {/* Date Selection */}
                    <div className="mb-8">
                        <h4 className="font-medium text-slate-700 mb-3">📅 Fecha</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                            {generateCalendarDays().map((date) => {
                                const isSelected = selectedDate?.toDateString() === date.toDateString();

                                return (
                                    <button
                                        key={date.toISOString()}
                                        onClick={() => {
                                            setSelectedDate(date);
                                            setSelectedTime(null);
                                        }}
                                        className={`flex-shrink-0 w-16 sm:w-20 p-2 sm:p-3 rounded-xl text-center transition-all ${isSelected
                                            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                                            : 'bg-white border border-slate-200 hover:border-primary-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="text-xs uppercase font-medium">
                                            {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                                        </div>
                                        <div className="text-xl sm:text-2xl font-bold mt-1">{date.getDate()}</div>
                                        <div className="text-xs">
                                            {date.toLocaleDateString('es-ES', { month: 'short' })}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                        <div className="animate-fade-in">
                            <h4 className="font-medium text-slate-700 mb-3">🕐 Hora disponible</h4>
                            {loading ? (
                                <div className="text-center py-8 text-slate-500">
                                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    Cargando horarios...
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {allTimeSlots.map((time) => {
                                        // Check if time is in the past for today
                                        let isPast = false;
                                        if (selectedDate) {
                                            const today = new Date();
                                            if (selectedDate.toDateString() === today.toDateString()) {
                                                const [hours, minutes] = time.split(':').map(Number);
                                                const slotTime = new Date(today);
                                                slotTime.setHours(hours, minutes, 0, 0);
                                                if (slotTime < today) {
                                                    isPast = true;
                                                }
                                            }
                                        }

                                        const isUnavailable = unavailableSlots.includes(time) || isPast;
                                        const isSelected = selectedTime === time;

                                        return (
                                            <button
                                                key={time}
                                                onClick={() => !isUnavailable && setSelectedTime(time)}
                                                disabled={isUnavailable}
                                                className={`py-3 px-2 rounded-xl text-center transition-all text-sm sm:text-base ${isSelected
                                                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg'
                                                    : isUnavailable
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                                                        : 'bg-white border border-slate-200 hover:border-primary-300 hover:shadow-md'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setStep('service')}
                            className="btn btn-secondary flex-1"
                        >
                            ← Atrás
                        </button>
                        <button
                            onClick={() => setStep('form')}
                            disabled={!selectedDate || !selectedTime}
                            className="btn btn-primary flex-1"
                        >
                            Continuar →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Customer Form */}
            {step === 'form' && (
                <div className="animate-fade-in">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 text-center">
                        Completa tus datos
                    </h3>

                    <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-4">
                        <div>
                            <label className="label">Nombre completo *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Juan Pérez"
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Teléfono (WhatsApp) *</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+595 991 234567"
                                className="input"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Placa del vehículo *</label>
                                <input
                                    type="text"
                                    value={formData.plate}
                                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                                    placeholder="ABC 123"
                                    className="input uppercase"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Modelo (opcional)</label>
                                <input
                                    type="text"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="Toyota Corolla"
                                    className="input"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Método de pago preferido</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'CASH', label: '💵 Efectivo' },
                                    { value: 'TRANSFER', label: '🏦 Transferencia' },
                                    { value: 'QR', label: '📱 QR' },
                                    { value: 'PAYMENT_LINK', label: '🔗 Link' },
                                ].map((method) => (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                                        className={`p-3 rounded-xl border text-left text-sm transition-all ${formData.paymentMethod === method.value
                                            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                                            : 'border-slate-200 hover:border-primary-300'
                                            }`}
                                    >
                                        {method.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setStep('datetime')}
                            className="btn btn-secondary flex-1"
                        >
                            ← Atrás
                        </button>
                        <button
                            onClick={() => setStep('confirm')}
                            disabled={formData.name.length < 3 || !isValidPhone(formData.phone) || !formData.plate}
                            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Revisar →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Confirm */}
            {step === 'confirm' && selectedService && selectedDate && selectedTime && (
                <div className="animate-fade-in">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 text-center">
                        Confirma tu reserva
                    </h3>

                    <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl">
                                🚗
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">{selectedService.name}</h4>
                                <p className="text-slate-600 text-sm">{selectedService.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <span className="text-slate-500">📅 Fecha</span>
                                <p className="font-medium mt-1">{formatDate(selectedDate)}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <span className="text-slate-500">🕐 Hora</span>
                                <p className="font-medium mt-1">{selectedTime}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <span className="text-slate-500">👤 Cliente</span>
                                <p className="font-medium mt-1">{formData.name}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <span className="text-slate-500">🚙 Vehículo</span>
                                <p className="font-medium mt-1">{formData.plate} {formData.model && `- ${formData.model}`}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-slate-600">Total a pagar</span>
                            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                                {new Intl.NumberFormat('es-PY').format(selectedService.price)} ₲
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setStep('form')}
                            className="btn btn-secondary flex-1"
                        >
                            ← Atrás
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn btn-success flex-1"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    Procesando...
                                </>
                            ) : (
                                <>✓ Confirmar y enviar a WhatsApp</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
