'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ServerProperties {
  [key: string]: string;
}

const BOOLEAN_PROPERTIES = [
  'allow-nether', 'allow-flight', 'enable-command-block', 'enable-rcon', 
  'enable-query', 'spawn-monsters', 'spawn-animals', 'spawn-npcs', 
  'pvp', 'hardcore', 'require-resource-pack', 'force-gamemode', 
  'white-list', 'enforce-whitelist', 'prevent-proxy-connections',
  'broadcast-rcon-to-ops', 'broadcast-console-to-ops', 'online-mode',
  'enable-jmx-monitoring', 'enable-status', 'enforce-secure-profile',
  'generate-structures', 'hide-online-players', 'log-ips', 'snooper-enabled',
  'sync-chunk-writes', 'use-native-transport'
];

const ENUM_PROPERTIES: Record<string, { default: string, options: string[] }> = {
  'gamemode': {
    default: 'survival',
    options: ['survival', 'creative', 'adventure', 'spectator']
  },
  'difficulty': {
    default: 'easy',
    options: ['peaceful', 'easy', 'normal', 'hard']
  },
  'level-type': {
    default: 'minecraft:normal',
    options: [
      'minecraft:normal', 
      'minecraft:flat', 
      'minecraft:large_biomes', 
      'minecraft:amplified', 
      'minecraft:single_biome_surface'
    ]
  }
};

// Definizione di tutte le proprietà (oltre 70) con categoria e tipo
const PROPERTIES_SCHEMA = [
  { key: 'motd', label: 'Messaggio del server', type: 'text', category: 'Generale' },
  { key: 'max-players', label: 'Max giocatori', type: 'number', category: 'Giocatori' },
  { key: 'difficulty', label: 'Difficoltà', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'], category: 'Gameplay' },
  { key: 'gamemode', label: 'Game mode', type: 'select', options: ['survival', 'creative', 'adventure', 'spectator'], category: 'Gameplay' },
  { key: 'online-mode', label: 'Online mode (Premium)', type: 'boolean', category: 'Sicurezza' },
  { key: 'pvp', label: 'PvP', type: 'boolean', category: 'Gameplay' },
  { key: 'white-list', label: 'Whitelist', type: 'boolean', category: 'Sicurezza' },
  { key: 'hardcore', label: 'Hardcore', type: 'boolean', category: 'Gameplay' },
  { key: 'allow-nether', label: 'Nether', type: 'boolean', category: 'Dimensioni' },
  { key: 'spawn-monsters', label: 'Mostri', type: 'boolean', category: 'Gameplay' },
  { key: 'enable-command-block', label: 'Command block', type: 'boolean', category: 'Funzioni' },
  { key: 'enable-rcon', label: 'RCON', type: 'boolean', category: 'Funzioni' },
  { key: 'rcon.port', label: 'Porta RCON', type: 'number', category: 'Funzioni' },
  { key: 'rcon.password', label: 'Password RCON', type: 'text', category: 'Funzioni' },
  { key: 'view-distance', label: 'Distanza vista', type: 'number', category: 'Performance' },
  { key: 'simulation-distance', label: 'Distanza simulazione', type: 'number', category: 'Performance' },
  { key: 'max-tick-time', label: 'Max tick time (ms)', type: 'number', category: 'Performance' },
  { key: 'allow-flight', label: 'Volo', type: 'boolean', category: 'Gameplay' },
  { key: 'enforce-secure-profile', label: 'Profilo sicuro', type: 'boolean', category: 'Sicurezza' },
  { key: 'enforce-whitelist', label: 'Forza whitelist', type: 'boolean', category: 'Sicurezza' },
  { key: 'entity-broadcast-range-percentage', label: 'Range entità %', type: 'number', category: 'Performance' },
  { key: 'force-gamemode', label: 'Forza gamemode', type: 'boolean', category: 'Gameplay' },
  { key: 'function-permission-level', label: 'Livello permessi funzioni', type: 'number', category: 'Amministrazione' },
  { key: 'generate-structures', label: 'Genera strutture', type: 'boolean', category: 'Mondo' },
  { key: 'hardcore', label: 'Hardcore', type: 'boolean', category: 'Gameplay' },
  { key: 'hide-online-players', label: 'Nascondi giocatori online', type: 'boolean', category: 'Privacy' },
  { key: 'level-name', label: 'Nome del mondo', type: 'text', category: 'Mondo' },
  { key: 'level-seed', label: 'Seed del mondo', type: 'text', category: 'Mondo' },
  { key: 'level-type', label: 'Tipo di mondo', type: 'select', options: ['minecraft:normal', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified', 'minecraft:single_biome_surface'], category: 'Mondo' },
  { key: 'log-ips', label: 'Log IP', type: 'boolean', category: 'Logging' },
  { key: 'max-chained-neighbor-updates', label: 'Max aggiornamenti vicini', type: 'number', category: 'Performance' },
  { key: 'max-world-size', label: 'Dimensione massima mondo', type: 'number', category: 'Mondo' },
  { key: 'network-compression-threshold', label: 'Soglia compressione rete', type: 'number', category: 'Rete' },
  { key: 'op-permission-level', label: 'Livello permessi OP', type: 'number', category: 'Amministrazione' },
  { key: 'pause-when-empty-seconds', label: 'Pausa se vuoto (sec)', type: 'number', category: 'Performance' },
  { key: 'player-idle-timeout', label: 'Timeout inattività (min)', type: 'number', category: 'Giocatori' },
  { key: 'prevent-proxy-connections', label: 'Previeni connessioni proxy', type: 'boolean', category: 'Sicurezza' },
  { key: 'query.port', label: 'Porta query', type: 'number', category: 'Rete' },
  { key: 'rate-limit', label: 'Rate limit', type: 'number', category: 'Rete' },
  { key: 'region-file-compression', label: 'Compressione regioni', type: 'select', options: ['deflate', 'none'], category: 'Performance' },
  { key: 'require-resource-pack', label: 'Richiedi resource pack', type: 'boolean', category: 'Risorse' },
  { key: 'resource-pack', label: 'URL resource pack', type: 'text', category: 'Risorse' },
  { key: 'server-port', label: 'Porta server', type: 'number', category: 'Rete' },
  { key: 'spawn-protection', label: 'Protezione spawn (raggio)', type: 'number', category: 'Protezione' },
  { key: 'sync-chunk-writes', label: 'Scrittura chunk sincrona', type: 'boolean', category: 'Performance' },
  { key: 'use-native-transport', label: 'Trasporto nativo', type: 'boolean', category: 'Rete' },
];

// Raggruppa per categoria
const groupedProperties = PROPERTIES_SCHEMA.reduce((acc, prop) => {
  if (!acc[prop.category]) acc[prop.category] = [];
  acc[prop.category].push(prop);
  return acc;
}, {} as Record<string, typeof PROPERTIES_SCHEMA>);

const API_BASE = '/api/orchestrator';

// Default server.properties configuration
const defaultServerProperties: Record<string, string> = {
  'accepts-transfers': 'false',
  'allow-flight': 'false',
  'allow-nether': 'true',
  'broadcast-console-to-ops': 'true',
  'broadcast-rcon-to-ops': 'true',
  'bug-report-link': '',
  'difficulty': 'easy',
  'enable-command-block': 'false',
  'enable-jmx-monitoring': 'false',
  'enable-query': 'false',
  'enable-rcon': 'false',
  'enable-status': 'true',
  'enforce-secure-profile': 'true',
  'enforce-whitelist': 'false',
  'entity-broadcast-range-percentage': '100',
  'force-gamemode': 'false',
  'function-permission-level': '2',
  'gamemode': 'survival',
  'generate-structures': 'true',
  'generator-settings': '{}',
  'hardcore': 'false',
  'hide-online-players': 'false',
  'initial-disabled-packs': '',
  'initial-enabled-packs': 'vanilla',
  'level-name': 'world',
  'level-seed': '',
  'level-type': 'minecraft\\:normal',
  'log-ips': 'true',
  'max-chained-neighbor-updates': '1000000',
  'max-players': '20',
  'max-tick-time': '60000',
  'max-world-size': '29999984',
  'motd': 'A Minecraft Server',
  'network-compression-threshold': '256',
  'online-mode': 'true',
  'op-permission-level': '4',
  'pause-when-empty-seconds': '60',
  'player-idle-timeout': '0',
  'prevent-proxy-connections': 'false',
  'pvp': 'true',
  'query.port': '25565',
  'rate-limit': '0',
  'rcon.password': '',
  'rcon.port': '25575',
  'region-file-compression': 'deflate',
  'require-resource-pack': 'false',
  'resource-pack': '',
  'resource-pack-id': '',
  'resource-pack-prompt': '',
  'resource-pack-sha1': '',
  'server-ip': '',
  'server-port': '25565',
  'simulation-distance': '10',
  'spawn-monsters': 'true',
  'spawn-protection': '16',
  'sync-chunk-writes': 'true',
  'text-filtering-config': '',
  'text-filtering-version': '0',
  'use-native-transport': 'true',
  'view-distance': '10',
  'white-list': 'false',
};

// UI Components
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-green-600' : 'bg-zinc-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function DropdownSelect({ value, options, onChange, label }: { value: string; options: string[]; onChange: (val: string) => void; label: string }) {
  return (
    <div className="py-2">
      <label className="block text-sm text-zinc-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function RangeSlider({ value, min, max, onChange, label, unit }: { value: number; min: number; max: number; onChange: (val: number) => void; label: string; unit?: string }) {
  return (
    <div className="py-2">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-zinc-300">{label}</label>
        <span className="text-sm text-blue-400 font-medium">{value}{unit ? ` ${unit}` : ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, label }: { value: number; onChange: (val: number) => void; label: string }) {
  return (
    <div className="py-2">
      <label className="block text-sm text-zinc-300 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function TextInput({ value, onChange, label }: { value: string; onChange: (val: string) => void; label: string }) {
  return (
    <div className="py-2">
      <label className="block text-sm text-zinc-300 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

// Inner component that uses useSearchParams
function ServerManagementInner() {
  const searchParams = useSearchParams();
  const urlServerId = searchParams?.get('serverId') ?? null;
  
  const [serverId, setServerId] = useState(urlServerId || '');
  const [properties, setProperties] = useState<ServerProperties>(defaultServerProperties);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<string[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  
  // Whitelist management state
  const [whitelist, setWhitelist] = useState<{ uuid: string; name: string }[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isWhitelistLoading, setIsWhitelistLoading] = useState(false);

  // Mod management state
  const [modFiles, setModFiles] = useState<File[]>([]);
  const [isModUploading, setIsModUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ file: string; status: string; reason?: string }[]>([]);

  // Load properties and whitelist when serverId changes
  useEffect(() => {
    if (!serverId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Load Properties
        const propRes = await fetch(`${API_BASE}/properties?serverId=${encodeURIComponent(serverId)}`, { headers });
        if (propRes.ok) {
          const data = await propRes.json();
          setProperties(data.properties || defaultServerProperties);
          setIsRunning(data.isRunning || false);
        }

        // Load Whitelist
        const whiteRes = await fetch(`${API_BASE}/players/${serverId}/whitelist`, { headers });
        if (whiteRes.ok) {
          const data = await whiteRes.json();
          setWhitelist(data);
        }

      } catch (err: any) {
        console.error('Error loading server data:', err);
        setError(err.message || 'Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [serverId]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    setIsWhitelistLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/players/${serverId}/whitelist`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ playerName: newPlayerName.trim() }),
      });
      
      if (!response.ok) throw new Error('Errore aggiunta player');
      
      const result = await response.json();
      setWhitelist([...whitelist, { uuid: result.uuid, name: result.playerName }]);
      setNewPlayerName('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsWhitelistLoading(false);
    }
  };

  const handleRemovePlayer = async (playerName: string) => {
    if (!confirm(`Rimuovere ${playerName} dalla whitelist?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/players/${serverId}/whitelist/${playerName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Errore rimozione player');
      
      setWhitelist(whitelist.filter(p => p.name !== playerName));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadMods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modFiles.length === 0) return;

    setIsModUploading(true);
    setUploadResults([]);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      modFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE}/files/mods/upload-bulk/${serverId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Errore caricamento mods');
      }
      
      const results = await response.json();
      setUploadResults(results);
      setModFiles([]);
      
      // Reset input file if possible
      const fileInput = document.getElementById('mod-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      alert('Caricamento completato!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsModUploading(false);
    }
  };

  const handleDownloadMods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/files/mods/export/${serverId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Nessuna mod trovata o errore nel download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mods_${serverId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSave = async () => {
    if (!serverId) {
      alert('Inserisci un ID server');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serverId, properties }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.writtenToContainer) {
        alert('Proprietà salvate. Il server è stato riavviato per applicare le modifiche.');
      } else {
        alert('Proprietà salvate con successo. Verranno applicate al prossimo avvio del server.');
      }
    } catch (err: any) {
      console.error('Error saving properties:', err);
      setError(err.message || 'Errore nel salvataggio delle proprietà');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = async (key: string, value: string) => {
    // Special handling for whitelist toggle
    if (key === 'white-list') {
      try {
        const token = localStorage.getItem('token');
        const enabled = value === 'true';
        const response = await fetch(`${API_BASE}/players/${serverId}/whitelist/toggle`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ enabled }),
        });
        
        if (!response.ok) throw new Error('Errore toggle whitelist');
        setProperties(prev => ({ ...prev, [key]: value }));
        return;
      } catch (err: any) {
        alert(err.message);
        return;
      }
    }

    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const loadServers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/servers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load servers');
      const data = await response.json();
      setServers(data.map((s: any) => s.id));
    } catch (error) {
      console.error('Error loading servers:', error);
      alert('Errore nel caricamento dei server');
    }
  };

  const handleDelete = async () => {
    if (selectedServers.length === 0) {
      alert('Seleziona almeno un server da eliminare');
      return;
    }
    if (!confirm(`Sei sicuro di voler eliminare ${selectedServers.length} server?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/servers/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serverIds: selectedServers }),
      });
      if (!response.ok) throw new Error('Failed to delete servers');
      alert('Server eliminati con successo!');
      setSelectedServers([]);
      loadServers();
    } catch (error) {
      console.error('Error deleting servers:', error);
      alert('Errore nell\'eliminazione dei server');
    }
  };

  // Render property input based on type
  const renderPropertyInput = (key: string) => {
    const value = properties[key] || '';
    
    // Boolean properties - Toggle Switch
    if (BOOLEAN_PROPERTIES.includes(key)) {
      return (
        <ToggleSwitch
          checked={value === 'true'}
          onChange={(checked) => handleChange(key, checked ? 'true' : 'false')}
          label={key}
        />
      );
    }
    
    // Enum properties - Dropdown
    if (ENUM_PROPERTIES[key]) {
      const config = ENUM_PROPERTIES[key];
      return (
        <DropdownSelect
          value={value || config.default}
          options={config.options}
          onChange={(val) => handleChange(key, val)}
          label={key}
        />
      );
    }
    
    // Range properties - Slider
    if (RANGE_PROPERTIES[key]) {
      const config = RANGE_PROPERTIES[key];
      return (
        <RangeSlider
          value={parseInt(value) || config.default}
          min={config.min}
          max={config.max}
          onChange={(val) => handleChange(key, val.toString())}
          label={key}
          unit={config.unit}
        />
      );
    }
    
    // Number properties - Number Input
    if (NUMBER_PROPERTIES.includes(key)) {
      return (
        <NumberInput
          value={parseInt(value) || 0}
          onChange={(val) => handleChange(key, val.toString())}
          label={key}
        />
      );
    }
    
    // Default - Text Input
    return (
      <TextInput
        value={value}
        onChange={(val) => handleChange(key, val)}
        label={key}
      />
    );
  };

  // Priority groups for organizing properties
  const priorityGroups = [
    {
      title: 'Generale',
      keys: ['motd', 'max-players', 'difficulty', 'gamemode', 'hardcore', 'online-mode', 'pvp']
    },
    {
      title: 'Mondo',
      keys: ['level-name', 'level-seed', 'level-type', 'generate-structures', 'allow-nether', 'generator-settings']
    },
    {
      title: 'Rete',
      keys: ['server-ip', 'server-port', 'view-distance', 'simulation-distance', 'network-compression-threshold', 'use-native-transport', 'prevent-proxy-connections']
    },
    {
      title: 'Giocatori',
      keys: ['white-list', 'enforce-whitelist', 'spawn-protection', 'player-idle-timeout', 'allow-flight', 'op-permission-level']
    },
    {
      title: 'Sicurezza & Moderazione',
      keys: ['enforce-secure-profile', 'log-ips', 'rate-limit', 'hide-online-players', 'accepts-transfers']
    },
    {
      title: 'Avanzate',
      keys: ['enable-command-block', 'function-permission-level', 'force-gamemode', 'spawn-monsters', 'entity-broadcast-range-percentage', 'max-world-size', 'max-tick-time', 'max-chained-neighbor-updates', 'sync-chunk-writes', 'pause-when-empty-seconds', 'region-file-compression']
    },
    {
      title: 'RCON & Query',
      keys: ['enable-rcon', 'rcon.port', 'rcon.password', 'enable-query', 'query.port']
    },
    {
      title: 'Resource Pack',
      keys: ['resource-pack', 'resource-pack-id', 'resource-pack-sha1', 'resource-pack-prompt', 'require-resource-pack']
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Gestione Server Minecraft</h1>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            ← Torna alla Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* BUG-006 FIX: ID Server ora in sola lettura come testo statico */}
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">ID Server</label>
              {serverId ? (
                <p className="font-mono text-sm text-zinc-300">{serverId}</p>
              ) : (
                <p className="text-sm text-red-400">Nessun server selezionato</p>
              )}
            </div>
            {isRunning && (
              <span className="px-3 py-1 bg-green-900/50 text-green-400 text-sm rounded-full">
                ● Server in esecuzione
              </span>
            )}
          </div>
          {!serverId && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded">
              <p className="text-red-300 text-sm">
                ERRORE: Nessun serverId trovato nell&apos;URL. 
                <Link href="/dashboard" className="underline ml-1">Torna alla dashboard</Link>
              </p>
            </div>
          )}
        </div>

        {/* Whitelist Management */}
        {!isLoading && serverId && (
          <div className="mb-8 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  🛡️ Gestione Whitelist
                </h3>
                <p className="text-zinc-400 text-sm">Aggiungi o rimuovi utenti che possono accedere al server</p>
              </div>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-mono rounded-full border border-zinc-700">
                whitelist.json
              </span>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Form Aggiunta */}
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input 
                  type="text" 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nome utente Minecraft (es. Steve)"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isWhitelistLoading}
                />
                <button 
                  type="submit"
                  disabled={isWhitelistLoading || !newPlayerName.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                >
                  {isWhitelistLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : '＋ Aggiungi'}
                </button>
              </form>

              {/* Lista Player */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {whitelist.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-zinc-500 italic bg-zinc-800/30 rounded-lg border border-dashed border-zinc-700">
                    Nessun utente in whitelist. Il server è aperto a tutti se la whitelist è OFF.
                  </div>
                ) : (
                  whitelist.map(player => (
                    <div key={player.uuid} className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg flex items-center justify-between hover:border-zinc-500 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-700 rounded-md flex items-center justify-center text-lg shadow-inner">
                          👤
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{player.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono truncate w-24">{player.uuid}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemovePlayer(player.name)}
                        className="text-zinc-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Rimuovi"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mod & Modpack Management */}
        {!isLoading && serverId && (
          <div className="mb-8 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  📦 Gestione Mod & Modpack
                </h3>
                <p className="text-zinc-400 text-sm">Carica file .jar (singole mod) o .zip (interi modpack)</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadMods}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700 transition-colors flex items-center gap-1"
                >
                  📥 Scarica /mods
                </button>
                <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-mono rounded-full border border-zinc-700">
                  /mods
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Form Upload Bulk */}
              <form onSubmit={handleUploadMods} className="space-y-4">
                <div className="flex flex-col gap-4 p-6 bg-zinc-800/50 border-2 border-dashed border-zinc-700 rounded-xl hover:border-blue-500/50 transition-colors">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-2">📁</div>
                    <p className="text-zinc-300 font-medium">Seleziona uno o più file</p>
                    <p className="text-zinc-500 text-xs">Supportati: .jar, .zip (auto-extract)</p>
                  </div>
                  <input 
                    id="mod-upload-input"
                    type="file" 
                    multiple
                    accept=".jar,.zip"
                    onChange={(e) => setModFiles(Array.from(e.target.files || []))}
                    className="block w-full text-sm text-zinc-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-zinc-700 file:text-zinc-200
                      hover:file:bg-zinc-600 cursor-pointer"
                  />
                </div>

                {modFiles.length > 0 && (
                  <div className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                    <span className="text-sm text-zinc-300">{modFiles.length} file selezionati</span>
                    <button 
                      type="submit"
                      disabled={isModUploading}
                      className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                      {isModUploading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : '🚀 Inizia Caricamento'}
                    </button>
                  </div>
                )}
              </form>

              {/* Risultati Upload */}
              {uploadResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-zinc-400 px-1">Risultati ultimo caricamento:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {uploadResults.map((res, idx) => (
                      <div key={idx} className={`text-xs p-2 rounded flex justify-between items-center ${
                        res.status === 'error' || res.status === 'rejected' ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'
                      }`}>
                        <span className="truncate flex-1 font-mono">{res.file}</span>
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-black/30">
                          {res.status === 'extracted' ? '📦 ESTRATTO' : 
                           res.status === 'uploaded' ? '✅ CARICATO' : 
                           res.status === 'rejected' ? '❌ RIFIUTATO' : '⚠️ ERRORE'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setUploadResults([])}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                  >
                    Pulisci cronologia
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-zinc-400">Caricamento proprietà...</p>
          </div>
        )}

        {!isLoading && Object.keys(properties).length > 0 && (
          <div className="space-y-6">
            {/* Nuovo rendering completo con tutte le proprietà */}
            {Object.entries(groupedProperties).map(([category, props]) => (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-1">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {props.map(prop => (
                    <div key={prop.key} className="flex justify-between items-center p-2 bg-zinc-800 rounded-md">
                      <label className="text-sm text-gray-300">{prop.label}</label>
                      {prop.type === 'boolean' ? (
                        <button
                          onClick={() => handleChange(prop.key, properties[prop.key] === 'true' ? 'false' : 'true')}
                          disabled={isRunning}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${properties[prop.key] === 'true' ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {properties[prop.key] === 'true' ? '✓ Attivo' : '✗ Disattivo'}
                        </button>
                      ) : prop.type === 'select' ? (
                        <select
                          value={properties[prop.key] || (prop.options ? prop.options[0] : '')}
                          onChange={(e) => handleChange(prop.key, e.target.value)}
                          disabled={isRunning}
                          className="bg-zinc-700 px-2 py-1 rounded text-sm disabled:opacity-50"
                        >
                          {prop.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type={prop.type}
                          value={properties[prop.key] ?? ''}
                          onChange={(e) => handleChange(prop.key, e.target.value)}
                          disabled={isRunning}
                          className="bg-zinc-700 px-2 py-1 rounded w-40 text-right text-sm disabled:opacity-50"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => setProperties(defaultServerProperties)}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            Ripristina Default
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !serverId}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
          >
            {isLoading ? 'Salvataggio...' : 'Salva Proprietà'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function ServerManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Caricamento...</p>
        </div>
      </div>
    }>
      <ServerManagementInner />
    </Suspense>
  );
}
