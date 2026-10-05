'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ShareTokenForm() {
  const [tokenInput, setTokenInput] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim().replace(/^.*\/share\//, '');
    if (cleanToken) {
      router.push(`/share/${encodeURIComponent(cleanToken)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto w-full">
      <label htmlFor="token-input" className="sr-only">
        Codice o link di invito
      </label>
      <input
        id="token-input"
        type="text"
        placeholder="Incolla il codice o URL di invito..."
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        required
        className="flex-1 p-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
      />
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3.5 rounded-xl font-medium transition-colors text-sm whitespace-nowrap cursor-pointer"
      >
        Accedi al Server
      </button>
    </form>
  );
}
