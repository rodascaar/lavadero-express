import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWhatsAppUrl, PAYMENT_METHOD_LABELS, generateReferenceCode } from '@/lib/whatsapp';

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
    timezone: string;
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

type Step = 'service' | 'datetime' | 'form' | 'confirm' | 'success';

interface SuccessData {
    whatsappUrl: string;
    referenceCode: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    paymentMethod: string;
    totalPrice: number;
}



// Generate WhatsApp URL


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

// Animation variants
const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

interface TimeSlotData {
    time: string;
    status: 'AVAILABLE' | 'FULL' | 'EXPIRED' | 'PAST';
    reason: string;
    count: number;
    available: boolean;
}

export function BookingWidget({ services, settings }: BookingWidgetProps) {
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<Step>('service');
    const [availableSlots, setAvailableSlots] = useState<TimeSlotData[]>([]);
    const [successData, setSuccessData] = useState<SuccessData | null>(null);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone: '',
        plate: '',
        model: '',
        paymentMethod: '',
    });
    const [paymentMethods, setPaymentMethods] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const fetchPaymentMethods = async () => {
        try {
            const response = await fetch('/api/admin/payment-methods');
            if (response.ok) {
                const methods = await response.json();
                const activeMethods = methods.filter((m: any) => m.active);
                setPaymentMethods(activeMethods);
                if (activeMethods.length > 0) {
                    setFormData(prev => ({ ...prev, paymentMethod: activeMethods[0].name }));
                }
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };

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
            // Format YYYY-MM-DD from UTC date to match business day correctly
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const response = await fetch(`/api/availability?date=${dateStr}`);
            if (response.ok) {
                const data = await response.json();
                setAvailableSlots(data.slots || []);
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarDays = () => {
        const days: Date[] = [];
        const timezone = settings.timezone || 'America/Asuncion';

        // 1. Obtener 'Hoy' en la zona horaria del negocio
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

        const dateParts = formatter.format(now); // Ej: "2025-01-22"
        const [y, m, d] = dateParts.split('-').map(Number);

        // Create a normalized Date for current business day (using UTC to avoid local timezone issues)
        const current = new Date(Date.UTC(y, m - 1, d));

        // 2. ARREGLO CRÍTICO: Parsear workingDays de forma segura
        let workingDays = settings.workingDays;

        if (typeof workingDays === 'string') {
            try {
                const cleanString = (workingDays as string).replace(/[\[\]]/g, '');
                workingDays = cleanString.split(',').map(Number);
            } catch (e) {
                workingDays = [1, 2, 3, 4, 5, 6];
            }
        } else if (!Array.isArray(workingDays)) {
            workingDays = [1, 2, 3, 4, 5, 6];
        }

        let count = 0;
        let safety = 0;

        while (count < 14 && safety < 60) {
            const dayOfWeek = current.getUTCDay(); // 0 (Dom) - 6 (Sab)

            if ((workingDays as number[]).includes(dayOfWeek)) {
                days.push(new Date(current));
                count++;
            }
            // Advance by adding steps to UTC Date
            current.setUTCDate(current.getUTCDate() + 1);
            safety++;
        }
        console.log(`Calendario generado: ${days.length} días. Primer día: ${days[0]?.toISOString()}`);
        return days;
    };


    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        });
    };

    const formatDateLong = (date: Date) => {
        const d = date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        });
        // Capitalize first letter and remove dot from short weekday/month
        return d.charAt(0).toUpperCase() + d.slice(1).replace(/\./g, '');
    };

    const formatTime12h = (time24: string) => {
        const [hours, minutes] = time24.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    };

    const handleSubmit = async () => {
        if (!selectedService || !selectedDate || !selectedTime) return;

        setLoading(true);

        try {
            const referenceCode = generateReferenceCode();
            // Format date as YYYY-MM-DD in UTC (normalized business day)
            const year = selectedDate.getUTCFullYear();
            const month = String(selectedDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getUTCDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
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

            // Generate WhatsApp URL
            const whatsappUrl = generateWhatsAppUrl(settings.whatsappNumber, {
                referenceCode,
                customerName: formData.name,
                customerPhone: formattedPhone, // Use the stored formatted phone
                plate: formData.plate.toUpperCase(),
                vehicleModel: formData.model,
                serviceName: selectedService.name,
                date: formatDateLong(selectedDate),
                time: formatTime12h(selectedTime),
                paymentMethod: formData.paymentMethod,
                totalPrice: selectedService.price,
                currency: settings.currency,
            }, settings.businessName, settings.welcomeMessage);

            // Set Success Data and Advance Step
            setSuccessData({
                whatsappUrl,
                referenceCode,
                customerName: formData.name,
                serviceName: selectedService.name,
                date: formatDateLong(selectedDate),
                time: selectedTime,
                paymentMethod: formData.paymentMethod,
                totalPrice: selectedService.price,
            });

            setStep('success');

        } catch (error: any) {
            console.error('Error:', error);
            alert(error.message || 'Hubo un error al procesar tu reserva.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="w-full">
            {/* Progress Indicator - Minimalist Line */}
            <div className="flex gap-1 mb-12 h-1 bg-white/10 rounded-full overflow-hidden w-full max-w-xs mx-auto">
                {['service', 'datetime', 'form', 'confirm'].map((s, i) => {
                    const isActive = ['service', 'datetime', 'form', 'confirm'].indexOf(step) >= i;
                    return (
                        <div
                            key={s}
                            className={`h-full flex-1 transition-all duration-500 ease-out ${isActive ? 'bg-primary-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-transparent'}`}
                        />
                    );
                })}
            </div>

            <AnimatePresence mode="wait">
                {/* Step 1: Select Service */}
                {step === 'service' && (
                    <motion.div
                        key="service"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="max-w-5xl mx-auto"
                    >
                        <h3 className="font-heading text-3xl text-white mb-8 text-center text-light">SELECT CONFIGURATION</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map((service, index) => (
                                <motion.button
                                    key={service.id}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => {
                                        setSelectedService(service);
                                        setStep('datetime');
                                    }}
                                    className={`group relative text-left bg-luxury-card border p-8 h-full transition-all duration-300 ${selectedService?.id === service.id
                                        ? 'border-primary-500 bg-white/5'
                                        : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                                        }`}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`absolute top-4 right-4 w-4 h-4 rounded-full border border-white/20 flex items-center justify-center transition-all ${selectedService?.id === service.id ? 'bg-primary-500 border-primary-500' : ''
                                        }`}>
                                        {selectedService?.id === service.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>

                                    <div className="mb-6 font-sans text-xs text-primary-500 tracking-widest uppercase">
                                        Package 0{index + 1}
                                    </div>

                                    <h4 className="font-heading text-2xl text-white mb-4 group-hover:text-primary-400 transition-colors">
                                        {service.name}
                                    </h4>

                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="font-technical text-xl text-white font-medium">
                                            {new Intl.NumberFormat('es-PY').format(service.price)}
                                        </span>
                                        <span className="font-technical text-sm text-gray-400">₲</span>
                                    </div>

                                    <div className="pt-6 border-t border-white/10">
                                        <p className="font-sans text-sm text-gray-300 leading-relaxed mb-4">
                                            {service.description || "Limpieza profunda y detallado premium."}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-300 font-technical uppercase tracking-wider">
                                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            {service.duration} mins est.
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Select Date & Time */}
                {step === 'datetime' && (
                    <motion.div
                        key="datetime"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="max-w-4xl mx-auto"
                    >
                        <h3 className="font-heading text-3xl text-white mb-2 text-center">HORARIO</h3>
                        <p className="text-center text-gray-400 font-sans text-sm mb-12 uppercase tracking-widest">Seleccione disponibilidad</p>

                        {/* Date Selection - Wheel Style */}
                        <div className="mb-12 relative">
                            <div className="flex gap-4 overflow-x-auto pb-4 px-12 snap-x no-scrollbar justify-start">
                                {generateCalendarDays().map((date, i) => {
                                    const isSelected = selectedDate?.toISOString().split('T')[0] === date.toISOString().split('T')[0];
                                    return (
                                        <motion.button
                                            key={date.toISOString()}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => {
                                                setSelectedDate(date);
                                                setSelectedTime(null);
                                            }}
                                            className={`flex-shrink-0 snap-center w-24 h-32 flex flex-col items-center justify-center border transition-all duration-300 ${isSelected
                                                ? 'bg-white text-luxury-black border-white scale-105'
                                                : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                                                }`}
                                        >
                                            <span className="text-xs uppercase tracking-widest mb-1 font-technical">
                                                {date.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}
                                            </span>
                                            <span className={`text-3xl font-heading mb-1 ${isSelected ? 'font-bold' : 'font-light'}`}>
                                                {date.getUTCDate()}
                                            </span>
                                            <span className="text-xs uppercase font-technical opacity-60">
                                                {date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', '')}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                            {/* Fade edges */}
                            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-luxury-black to-transparent pointer-events-none md:hidden" />
                            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-luxury-black to-transparent pointer-events-none md:hidden" />
                        </div>

                        {/* Time Selection */}
                        <AnimatePresence mode="wait">
                            {selectedDate && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-white/10 pt-10"
                                >
                                    {loading ? (
                                        <div className="text-center py-8 text-white/50 animate-pulse font-technical text-sm uppercase tracking-widest">
                                            Analizando disponibilidad...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {availableSlots.map((slot, i) => {
                                                const isUnavailable = !slot.available;
                                                const isSelected = selectedTime === slot.time;

                                                return (
                                                    <motion.button
                                                        key={slot.time}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.02 }}
                                                        onClick={() => setSelectedTime(slot.time)}
                                                        disabled={isUnavailable}
                                                        className={`
                                                            relative w-full h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden border
                                                            ${!isUnavailable
                                                                ? (isSelected
                                                                    ? 'bg-primary-600 border-primary-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                                                                    : 'bg-white/5 border-white/10 text-white hover:border-white/40 hover:bg-white/10')
                                                                : 'bg-gray-800/20 border-white/5 text-white/10 opacity-60 grayscale cursor-not-allowed'
                                                            }
                                                        `}
                                                    >
                                                        {/* Time */}
                                                        <span className="text-xl font-mono font-bold tracking-wider">
                                                            {slot.time}
                                                        </span>

                                                        {/* Error Label */}
                                                        {isUnavailable && slot.reason && (
                                                            <span className="absolute top-1 right-1 text-[8px] font-bold tracking-tighter text-gray-500 bg-white/5 px-1 rounded-sm uppercase">
                                                                {slot.reason}
                                                            </span>
                                                        )}

                                                        {/* Scarcity / Unavailable design Effect */}
                                                        {isUnavailable && (
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                                                <div className="w-full h-[1px] bg-white/20 transform rotate-12"></div>
                                                            </div>
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex gap-6 mt-16 justify-center">
                            <button
                                onClick={() => setStep('service')}
                                className="px-8 py-3 text-sm font-technical uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={() => setStep('form')}
                                disabled={!selectedDate || !selectedTime}
                                className="px-8 py-3 bg-white text-luxury-black text-sm font-technical uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Continuar
                            </button>
                        </div>
                    </motion.div>
                )
                }

                {/* Step 3: Customer Form */}
                {
                    step === 'form' && (
                        <motion.div
                            key="form"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="max-w-2xl mx-auto"
                        >
                            <h3 className="font-heading text-3xl text-white mb-2 text-center">DATOS DE CLIENTE</h3>
                            <p className="text-center text-gray-400 font-sans text-sm mb-12 uppercase tracking-widest">Información de contacto y vehículo</p>

                            <div className="space-y-8 bg-luxury-card border border-white/5 p-8 md:p-12">
                                <div className="group">
                                    <label className="block text-xs font-technical uppercase tracking-widest text-primary-500 mb-2">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white font-heading focus:outline-none focus:border-primary-500 transition-colors placeholder-white/10"
                                        placeholder="Ingrese su nombre"
                                        required
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-xs font-technical uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-primary-500 transition-colors">Teléfono (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white font-technical focus:outline-none focus:border-primary-500 transition-colors placeholder-white/10"
                                        placeholder="+595 900 000 000"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-xs font-technical uppercase tracking-widest text-gray-400 mb-2">Placa (Patente)</label>
                                        <input
                                            type="text"
                                            value={formData.plate}
                                            onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                                            className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white font-technical uppercase focus:outline-none focus:border-primary-500 transition-colors placeholder-white/10"
                                            placeholder="ABC 123"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-technical uppercase tracking-widest text-gray-400 mb-2">Modelo (Opcional)</label>
                                        <input
                                            type="text"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white font-heading focus:outline-none focus:border-primary-500 transition-colors placeholder-white/10"
                                            placeholder="Toyota Corolla"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <label className="block text-xs font-technical uppercase tracking-widest text-gray-400 mb-4">Método de Pago</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {paymentMethods.map((method) => (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, paymentMethod: method.name })}
                                                className={`py-3 px-4 border text-sm font-technical uppercase tracking-wider text-left transition-all ${formData.paymentMethod === method.name
                                                    ? 'border-primary-500 text-white bg-white/5'
                                                    : 'border-white/10 text-gray-400 hover:border-white/30'
                                                    }`}
                                            >
                                                {method.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-6 mt-12 justify-center">
                                <button
                                    onClick={() => setStep('datetime')}
                                    className="px-8 py-3 text-sm font-technical uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={() => setStep('confirm')}
                                    disabled={formData.name.length < 3 || !isValidPhone(formData.phone) || !formData.plate}
                                    className="px-8 py-3 bg-white text-luxury-black text-sm font-technical uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Revisar
                                </button>
                            </div>
                        </motion.div>
                    )
                }

                {/* Step 4: Confirm */}
                {
                    step === 'confirm' && selectedService && selectedDate && selectedTime && (
                        <motion.div
                            key="confirm"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="max-w-2xl mx-auto"
                        >
                            <h3 className="font-heading text-3xl text-white mb-2 text-center">CONFIRMACIÓN</h3>
                            <p className="text-center text-gray-400 font-sans text-sm mb-12 uppercase tracking-widest">Resumen de solicitud</p>

                            <div className="bg-white text-luxury-black p-8 md:p-12 relative overflow-hidden">
                                {/* Decorative perforated edge or styling */}
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 via-primary-700 to-primary-500"></div>

                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-1">Servicio</div>
                                        <div className="font-heading text-3xl font-bold">{selectedService.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-1">Precio</div>
                                        <div className="font-technical text-2xl font-bold">{new Intl.NumberFormat('es-PY').format(selectedService.price)} ₲</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-12 border-t border-gray-200 pt-8">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-2">Fecha</div>
                                        <div className="font-technical text-lg font-medium">{formatDate(selectedDate)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-2">Hora</div>
                                        <div className="font-technical text-lg font-medium">{selectedTime}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-2">Cliente</div>
                                        <div className="font-heading text-lg font-medium">{formData.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-2">Vehículo</div>
                                        <div className="font-technical text-lg font-medium uppercase">{formData.plate}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-200 pt-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <div className="text-xs uppercase tracking-widest text-gray-400">Estado: Pendiente</div>
                                    </div>
                                    <div className="font-technical text-xs text-gray-400 text-right uppercase tracking-widest">
                                        Pagado vía {formData.paymentMethod}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-6 mt-12 justify-center">
                                <button
                                    onClick={() => setStep('form')}
                                    className="px-8 py-3 text-sm font-technical uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-10 py-4 bg-primary-600 text-white font-technical uppercase tracking-[0.2em] text-sm hover:bg-primary-500 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {loading ? 'PROCESANDO...' : 'CONFIRMAR RESERVA'}
                                </button>
                            </div>
                        </motion.div>
                    )
                }

                {/* Step 5: Success */}
                {
                    step === 'success' && successData && (
                        <motion.div
                            key="success"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="max-w-2xl mx-auto text-center"
                        >
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>

                            <h3 className="font-heading text-4xl text-white mb-2">¡RESERVA CONFIRMADA!</h3>
                            <p className="text-gray-400 font-sans text-sm mb-12 uppercase tracking-widest">Te esperamos en AutoSpa</p>

                            <div className="bg-luxury-card border border-white/5 p-8 rounded-2xl mb-12">
                                <div className="text-sm font-technical text-primary-500 uppercase tracking-widest mb-2">Código de Reserva</div>
                                <div className="text-4xl font-mono text-white tracking-wider mb-8">{successData.referenceCode}</div>

                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fecha</div>
                                        <div className="text-white font-medium">{successData.date}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Hora</div>
                                        <div className="text-white font-medium">{successData.time}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <a
                                    href={successData.whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-4 bg-green-600 hover:bg-green-500 text-white font-technical uppercase tracking-[0.2em] text-sm transition-all shadow-[0_0_30px_rgba(22,163,74,0.3)] hover:shadow-[0_0_40px_rgba(22,163,74,0.5)] rounded-sm"
                                >
                                    ABRIR WHATSAPP
                                </a>
                                <button
                                    onClick={() => {
                                        const ticket = `[ ${settings.businessName.toUpperCase()} ]
RESERVA CONFIRMADA
ID   : ${successData.referenceCode}
----------------------------------
Nombre   : ${successData.customerName}
Auto     : ${successData.serviceName}
Fecha    : ${successData.date}
Hora     : ${successData.time}
Total    : ${new Intl.NumberFormat('es-PY').format(successData.totalPrice)} Gs.
----------------------------------
Gracias por elegirnos.`;
                                        navigator.clipboard.writeText(ticket);
                                        alert('Ticket copiado al portapapeles');
                                    }}
                                    className="block w-full py-4 border border-white/10 text-white font-technical uppercase tracking-[0.2em] text-sm hover:bg-white/5 transition-colors rounded-sm"
                                >
                                    📋 COPIAR TICKET
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="block w-full py-4 text-gray-400 hover:text-white font-technical uppercase tracking-[0.2em] text-sm transition-colors"
                                >
                                    VOLVER AL INICIO
                                </button>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}

