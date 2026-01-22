import React, { useState } from 'react';
import { motion } from 'framer-motion';

const CreateUserForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', name, email, password, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al crear usuario');
            }

            setMessage({ type: 'success', text: 'Usuario creado exitosamente' });
            setName('');
            setEmail('');
            setPassword('');
            setRole('EMPLOYEE');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto bg-luxury-card border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
            {/* Animated top border line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-primary-700 to-primary-500"></div>

            <h2 className="font-heading text-3xl text-white mb-2 text-center uppercase tracking-widest font-light">NUEVO USUARIO</h2>
            <p className="text-center text-gray-400 font-sans text-[10px] mb-12 uppercase tracking-[0.4em]">Gestión de Acceso Premium</p>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="group">
                    <label className="block text-[10px] font-technical uppercase tracking-[0.2em] text-primary-500 mb-3 ml-1">Nombre Completo</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-lg text-white font-heading focus:outline-none focus:border-primary-500 transition-colors placeholder-white/5"
                        placeholder="EJ: JUAN PÉREZ"
                    />
                </div>

                <div className="group">
                    <label className="block text-[10px] font-technical uppercase tracking-[0.2em] text-gray-400 mb-3 ml-1 group-focus-within:text-primary-500 transition-colors">Email Corporativo</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-lg text-white font-technical focus:outline-none focus:border-primary-500 transition-colors placeholder-white/5"
                        placeholder="EMAIL@AUTOSPA.COM"
                    />
                </div>

                <div className="group">
                    <label className="block text-[10px] font-technical uppercase tracking-[0.2em] text-gray-400 mb-3 ml-1 group-focus-within:text-primary-500 transition-colors">Contraseña Inicial</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-lg text-white font-technical focus:outline-none focus:border-primary-500 transition-colors placeholder-white/5"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-technical uppercase tracking-[0.2em] text-gray-400 mb-4 text-center">Nivel de Seguridad</label>
                    <div className="flex p-1 bg-black/40 border border-white/5">
                        <button
                            type="button"
                            onClick={() => setRole('EMPLOYEE')}
                            className={`flex-1 py-3 px-4 text-[10px] font-technical uppercase tracking-widest transition-all ${role === 'EMPLOYEE'
                                    ? 'bg-white text-black font-bold'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Operador
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('ADMIN')}
                            className={`flex-1 py-3 px-4 text-[10px] font-technical uppercase tracking-widest transition-all ${role === 'ADMIN'
                                    ? 'bg-primary-600 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Admin
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-technical uppercase tracking-[0.3em] text-xs py-5 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_5px_15px_rgba(0,0,0,0.3)] active:scale-[0.98]"
                    >
                        {loading ? 'PROCESANDO...' : 'ALTA DE USUARIO'}
                    </button>
                </div>

                {message.text && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-center p-4 text-[10px] font-technical uppercase tracking-[0.2em] ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                        {message.text}
                    </motion.div>
                )}
            </form>
        </motion.div>
    );
};

export default CreateUserForm;
