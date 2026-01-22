import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const InstructionModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if the user has already seen the modal in this session
        const hasSeenModal = sessionStorage.getItem("hasSeenInstructionModal");

        if (!hasSeenModal) {
            // Show modal after a small delay for better UX
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem("hasSeenInstructionModal", "true");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative bg-luxury-card border border-white/10 p-5 md:p-8 rounded-2xl max-w-md w-full shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="text-center mb-6">
                            <h3 className="font-heading text-2xl text-white mb-2">
                                ¿Cómo Reservar?
                            </h3>
                            <div className="w-16 h-1 bg-primary-600 mx-auto rounded-full" />
                        </div>

                        <div className="space-y-4 mb-8">
                            <InstructionStep
                                number="1"
                                title="Selecciona tus Servicios"
                                description="Elige el tipo de lavado y servicios adicionales que deseas."
                            />
                            <InstructionStep
                                number="2"
                                title="Elige Fecha y Hora"
                                description="Selecciona el horario que mejor se adapte a tu agenda."
                            />
                            <InstructionStep
                                number="3"
                                title="Confirma en WhatsApp"
                                description="Al finalizar, se abrirá WhatsApp automáticamente. Envía el mensaje pre-cargado para confirmar tu cita con un asesor."
                                isHighlight
                            />
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full py-4 bg-primary-600 text-white font-sans font-bold rounded-xl hover:bg-primary-500 transition-all shadow-lg shadow-primary-500/20 active:scale-95 uppercase tracking-wide"
                        >
                            Entendido, ¡Comencemos!
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Helper component for steps
const InstructionStep = ({
    number,
    title,
    description,
    isHighlight = false,
}: {
    number: string;
    title: string;
    description: string;
    isHighlight?: boolean;
}) => (
    <div
        className={`flex gap-4 items-start p-3 rounded-xl transition-colors ${isHighlight ? "bg-primary-900/10 border border-primary-500/20" : ""
            }`}
    >
        <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-heading text-lg ${isHighlight
                ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                : "bg-white/10 text-gray-400"
                }`}
        >
            {number}
        </div>
        <div className="text-left">
            <h4
                className={`font-medium mb-1 ${isHighlight ? "text-primary-400" : "text-white"
                    }`}
            >
                {title}
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
        </div>
    </div>
);
