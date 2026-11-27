import React, { useState, useRef } from 'react';
import { api } from '../../services/api.js';
import ItemMenu from '../Admin/ItemMenu.jsx';
import { PlusCircle, UploadCloud, X, Image as ImageIcon } from 'lucide-react';

const comprimirImagenEnNavegador = (archivo, maxAncho = 800, calidad = 0.78) =>
  new Promise((resolve, reject) => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      reject(new Error('Seleccioná un archivo de imagen válido.'));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('La imagen está dañada o no es compatible.'));
      img.onload = () => {
        let ancho = img.naturalWidth || img.width;
        let alto = img.naturalHeight || img.height;

        if (ancho > maxAncho) {
          alto = Math.round((alto * maxAncho) / ancho);
          ancho = maxAncho;
        }

        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el procesador de imagen.'));
          return;
        }

        ctx.drawImage(img, 0, 0, ancho, alto);

        let dataUrl = canvas.toDataURL('image/webp', calidad);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', calidad);
        }

        const pesoAproxKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({
          dataUrl,
          pesoKb: pesoAproxKb,
          nombreArchivo: archivo.name
        });
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });

const SeccionCarta = ({ productos = {}, refresh }) => {
  const categoriasDisponibles = Object.keys(productos);
  const categoriaInicial = categoriasDisponibles.includes('milanesas')
    ? 'milanesas'
    : categoriasDisponibles[0] || 'milanesas';

  const [nuevo, setNuevo] = useState({
    nombre: '',
    precio: '',
    categoria: categoriaInicial
  });
  const [imagenComprimida, setImagenComprimida] = useState(null);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [errorImagen, setErrorImagen] = useState('');
  const [guardando, setGuardando] = useState(false);

  const inputArchivoRef = useRef(null);

  const puedeAgregar =
    Boolean(nuevo.nombre.trim()) &&
    nuevo.precio !== '' &&
    Number(nuevo.precio) >= 0 &&
    !guardando &&
    !procesandoImagen;

  const procesarArchivo = async (archivo) => {
    if (!archivo) return;
    setErrorImagen('');
    setProcesandoImagen(true);
    try {
      const resultado = await comprimirImagenEnNavegador(archivo);
      setImagenComprimida(resultado);
    } catch (err) {
      setImagenComprimida(null);
      setErrorImagen(err?.message || 'Error al procesar la imagen.');
    } finally {
      setProcesandoImagen(false);
    }
  };

  const limpiarImagen = () => {
    setImagenComprimida(null);
    setErrorImagen('');
    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = '';
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    const archivo = e.dataTransfer?.files?.[0];
    if (archivo) {
      await procesarArchivo(archivo);
    }
  };

  const agregar = async (e) => {
    e.preventDefault();
    if (!puedeAgregar) return;

    setGuardando(true);
    try {
      const payload = {
        ...nuevo,
        nombre: nuevo.nombre.trim().toUpperCase(),
        precio: Number(nuevo.precio)
      };
      if (imagenComprimida?.dataUrl) {
        payload.imagenBase64 = imagenComprimida.dataUrl;
      }

      await api.addProducto(nuevo.categoria, payload);
      setNuevo((prev) => ({ ...prev, nombre: '', precio: '' }));
      limpiarImagen();
      await refresh?.();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] text-white">
      {/* FORMULARIO FIJO ARRIBA */}
      <div className="mb-5 shrink-0">
        <form
          onSubmit={agregar}
          className="bg-gradient-to-b from-[#111318] to-[#0a0b0e] border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col gap-3.5 shadow-xl"
        >
          <div className="flex flex-wrap gap-3.5 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
                Producto
              </label>
              <input
                type="text"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                className="input-dark w-full rounded-xl bg-black/70 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white placeholder:text-gray-600 uppercase outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="EJ. MILANESA NAPOLITANA"
              />
            </div>

            <div className="w-28 sm:w-32">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
                Precio
              </label>
              <input
                type="number"
                min="0"
                value={nuevo.precio}
                onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })}
                className="input-dark w-full rounded-xl bg-black/70 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all tabular-nums"
                placeholder="$ 0"
              />
            </div>

            <div className="w-full sm:w-44">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
                Categoría
              </label>
              <select
                value={nuevo.categoria}
                onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
                className="input-dark w-full rounded-xl bg-black/70 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
              >
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#111318] text-white">
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!puedeAgregar}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:border-white/5 text-black font-black text-xs uppercase tracking-wider border border-orange-300/30 shadow-md shadow-orange-600/20 disabled:shadow-none flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <PlusCircle size={16} strokeWidth={2.5} />
              <span>{guardando ? 'Agregando...' : 'Agregar'}</span>
            </button>
          </div>

          {/* ZONA ARRASTRAR Y SOLTAR FOTO */}
          <div>
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const archivo = e.target.files?.[0];
                if (archivo) await procesarArchivo(archivo);
              }}
            />

            {!imagenComprimida ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputArchivoRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputArchivoRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!arrastrando) setArrastrando(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setArrastrando(false);
                }}
                onDrop={handleDrop}
                className={`rounded-xl border border-dashed px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  arrastrando
                    ? 'border-orange-400 bg-orange-500/15'
                    : 'border-white/15 bg-black/40 hover:border-orange-500/50 hover:bg-black/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UploadCloud
                    size={18}
                    className={arrastrando ? 'text-orange-400 shrink-0' : 'text-gray-400 shrink-0'}
                  />
                  <span className="text-[11px] font-bold text-gray-300 truncate">
                    {procesandoImagen
                      ? 'Optimizando imagen...'
                      : 'Arrastrá una foto aquí o hacé clic para elegir (opcional)'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400/90 shrink-0">
                  JPG · PNG · WEBP
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-orange-500/30 bg-black/50 px-3 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={imagenComprimida.dataUrl}
                    alt="Vista previa del producto"
                    className="w-11 h-11 rounded-lg object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-orange-400 shrink-0" />
                      <span className="truncate">{imagenComprimida.nombreArchivo}</span>
                    </p>
                    <p className="text-[10px] font-bold text-emerald-400 tabular-nums">
                      Lista (~{imagenComprimida.pesoKb} KB comprimida)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={limpiarImagen}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-colors shrink-0 cursor-pointer"
                  title="Quitar foto"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {errorImagen && (
              <p className="text-[11px] font-bold text-red-400 mt-1.5 ml-1">
                {errorImagen}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* CONTENEDOR CON SCROLL */}
      <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-8">
        {Object.entries(productos).map(([cat, list]) => {
          const items = Array.isArray(list) ? list : [];
          return (
            <section key={cat} className="space-y-3">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[#060606]/95 backdrop-blur-sm py-2 px-1 border-b border-white/10">
                <h2 className="text-orange-400 font-black uppercase text-[11px] tracking-[0.2em] border-l-2 border-orange-500 pl-3">
                  {cat}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/10 tabular-nums">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                {items.map((p) => (
                  <ItemMenu
                    key={p.id}
                    producto={p}
                    categoria={cat}
                    refresh={refresh}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default SeccionCarta;