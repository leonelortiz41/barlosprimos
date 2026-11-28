import React, { useState, useRef } from 'react';
import { api, getImagenUrl } from '../../services/api';
import { comprimirImagenEnNavegador } from '../Config/SeccionCarta';
import {
  Save,
  Edit2,
  X,
  Trash2,
  ImagePlus,
  ImageOff,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react';

const AGREGADOS_RAPIDOS = [
  'JAMÓN',
  'QUESO',
  'HUEVO',
  'PAPAS',
  'CHEDDAR'
];

const ItemMenu = ({ producto, categoria, refresh }) => {
  const [editando, setEditando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(producto.nombre || '');
  const [nuevoPrecio, setNuevoPrecio] = useState(producto.precio ?? '');
  const [nuevaDescripcion, setNuevaDescripcion] = useState(producto.descripcion || '');
  const [imagenComprimida, setImagenComprimida] = useState(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [errorImagen, setErrorImagen] = useState('');
  const [guardando, setGuardando] = useState(false);

  const inputArchivoRef = useRef(null);

  const urlImagenActual = getImagenUrl(producto.imagen);

  const abrirEdicion = () => {
    setNuevoNombre(producto.nombre || '');
    setNuevoPrecio(producto.precio ?? '');
    setNuevaDescripcion(producto.descripcion || '');
    setImagenComprimida(null);
    setQuitarImagen(false);
    setArrastrando(false);
    setErrorImagen('');
    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = '';
    }
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setNuevaDescripcion(producto.descripcion || '');
    setImagenComprimida(null);
    setQuitarImagen(false);
    setArrastrando(false);
    setErrorImagen('');
    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = '';
    }
  };

  const alternarAgregadoRapido = (agregado) => {
    setNuevaDescripcion((prev) => {
      const actuales = String(prev || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const existe = actuales.includes(agregado);
      const siguientes = existe
        ? actuales.filter((item) => item !== agregado)
        : [...actuales, agregado];

      return siguientes.join(', ');
    });
  };

  const manejarArchivo = async (archivo) => {
    if (!archivo) return;
    setErrorImagen('');
    setProcesandoImagen(true);
    try {
      const comprimida = await comprimirImagenEnNavegador(archivo);
      setImagenComprimida(comprimida);
      setQuitarImagen(false);
    } catch (err) {
      setImagenComprimida(null);
      setErrorImagen(err?.message || 'Error al procesar la imagen.');
    } finally {
      setProcesandoImagen(false);
    }
  };

  const manejarDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    if (procesandoImagen || guardando) return;
    const archivo = e.dataTransfer?.files?.[0];
    if (archivo) {
      await manejarArchivo(archivo);
    }
  };

  const manejarQuitarImagen = () => {
    setImagenComprimida(null);
    setQuitarImagen(true);
    setErrorImagen('');
    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = '';
    }
  };

  const guardarCambios = async () => {
    if (guardando || procesandoImagen) return;

    const nombreLimpio = String(nuevoNombre || '').trim().toUpperCase();
    const precioNumero = Number(nuevoPrecio);
    const descripcionLimpia = String(nuevaDescripcion || '').trim().toUpperCase();

    if (!nombreLimpio) {
      alert('Ingresá un nombre para el producto.');
      return;
    }
    if (nuevoPrecio === '' || Number.isNaN(precioNumero) || precioNumero < 0) {
      alert('Ingresá un precio válido.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: nombreLimpio,
        precio: precioNumero,
        descripcion: descripcionLimpia
      };

      if (imagenComprimida?.dataUrl) {
        payload.imagenBase64 = imagenComprimida.dataUrl;
      } else if (quitarImagen) {
        payload.imagen = null;
      }

      await api.updateProducto(categoria, producto.id, payload);
      setEditando(false);
      setImagenComprimida(null);
      setQuitarImagen(false);
      setArrastrando(false);
      await refresh?.();
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      alert('Error al actualizar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = async () => {
    if (window.confirm(`¿Seguro que quieres borrar ${producto.nombre}?`)) {
      try {
        await api.deleteProducto(categoria, producto.id);
        await refresh?.();
      } catch (err) {
        console.error('Error al borrar producto:', err);
        alert('Error al borrar');
      }
    }
  };

  const agregadosActivosSet = new Set(
    String(nuevaDescripcion || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );

  const vistaPreviaSrc = imagenComprimida?.dataUrl
    ? imagenComprimida.dataUrl
    : quitarImagen
    ? ''
    : urlImagenActual;

  return (
    <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-xl hover:border-gray-600 transition-all space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {urlImagenActual ? (
            <img
              src={urlImagenActual}
              alt={producto.nombre}
              className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0 bg-black"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-dashed border-gray-700 bg-black/40 flex items-center justify-center text-gray-600 shrink-0">
              <ImageIcon size={18} />
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-white font-bold uppercase text-sm truncate">
              {producto.nombre}
            </span>
            {!editando && (
              <>
                {producto.descripcion && (
                  <span className="text-[11px] text-amber-300/90 font-semibold truncate">
                    {producto.descripcion}
                  </span>
                )}
                <span className="text-[11px] text-gray-500">
                  {urlImagenActual ? 'Con foto' : 'Sin foto'}
                </span>
              </>
            )}
          </div>
        </div>

        {!editando ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-black text-white tabular-nums">
              ${Number(producto.precio || 0).toLocaleString('es-AR')}
            </span>
            <button
              type="button"
              onClick={abrirEdicion}
              className="text-gray-400 hover:text-orange-400 transition-colors cursor-pointer"
              title="Editar producto, descripción y foto"
            >
              <Edit2 size={16} />
            </button>
            <button
              type="button"
              onClick={eliminarProducto}
              className="text-red-500/60 hover:text-red-500 transition-colors cursor-pointer"
              title="Eliminar producto"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={guardarCambios}
              disabled={guardando || procesandoImagen}
              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 disabled:opacity-50 transition-colors cursor-pointer"
              title="Guardar cambios"
            >
              <Save size={16} />
            </button>
            <button
              type="button"
              onClick={cancelarEdicion}
              disabled={guardando}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {editando && (
        <div className="pt-3 border-t border-gray-800/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full bg-black border border-gray-700 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white uppercase outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                Precio
              </label>
              <input
                type="number"
                min="0"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                className="w-full bg-black border border-gray-700 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                Descripción / Agregados del especial
              </label>
              <span className="text-[10px] text-amber-300/85 font-semibold">
                Base sándwiches: ají, mayonesa, mostaza, lechuga y tomate
              </span>
            </div>

            <input
              type="text"
              value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
              className="w-full bg-black border border-gray-700 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white uppercase outline-none"
              placeholder="EJ. JAMÓN, QUESO, HUEVO Y PANCETA"
            />

            <div className="flex flex-wrap gap-1.5">
              {AGREGADOS_RAPIDOS.map((agregado) => {
                const activo = agregadosActivosSet.has(agregado);
                return (
                  <button
                    key={agregado}
                    type="button"
                    onClick={() => alternarAgregadoRapido(agregado)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                      activo
                        ? 'bg-orange-500 text-black border-orange-300'
                        : 'bg-white/[0.04] hover:bg-white/[0.09] text-gray-300 border-white/10'
                    }`}
                  >
                    + {agregado}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!arrastrando && !procesandoImagen && !guardando) setArrastrando(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setArrastrando(false);
            }}
            onDrop={manejarDrop}
            className={`flex flex-wrap items-center justify-between gap-2 border rounded-xl p-2.5 transition-all ${
              arrastrando
                ? 'border-dashed border-orange-400 bg-orange-500/15'
                : 'border-dashed border-gray-700 bg-black/50 hover:border-orange-500/40'
            }`}
          >
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const archivo = e.target.files?.[0];
                if (archivo) await manejarArchivo(archivo);
              }}
            />

            <div className="flex items-center gap-2.5 min-w-0">
              {vistaPreviaSrc ? (
                <img
                  src={vistaPreviaSrc}
                  alt="Vista previa"
                  className="w-11 h-11 rounded-lg object-cover border border-white/15 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-gray-600 shrink-0">
                  <UploadCloud size={16} />
                </div>
              )}

              <div className="text-[11px] min-w-0">
                {arrastrando ? (
                  <span className="text-orange-300 font-black block">
                    Soltá la imagen aquí
                  </span>
                ) : procesandoImagen ? (
                  <span className="text-orange-400 font-bold">Optimizando imagen...</span>
                ) : imagenComprimida ? (
                  <span className="text-emerald-400 font-bold block truncate">
                    Nueva foto lista (~{imagenComprimida.pesoKb} KB)
                  </span>
                ) : quitarImagen ? (
                  <span className="text-amber-300 font-bold block">
                    Se quitará la foto al guardar
                  </span>
                ) : (
                  <span className="text-gray-400 block truncate">
                    {urlImagenActual
                      ? 'Arrastrá una foto o cambiá la actual'
                      : 'Arrastrá una foto aquí o elegí un archivo'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                disabled={procesandoImagen || guardando}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-[11px] font-black uppercase cursor-pointer transition-colors"
              >
                <ImagePlus size={13} />
                <span>{urlImagenActual && !quitarImagen ? 'Cambiar foto' : 'Subir foto'}</span>
              </button>

              {(urlImagenActual || imagenComprimida) && !quitarImagen && (
                <button
                  type="button"
                  onClick={manejarQuitarImagen}
                  disabled={procesandoImagen || guardando}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-black uppercase cursor-pointer transition-colors"
                >
                  <ImageOff size={13} />
                  <span>Quitar</span>
                </button>
              )}
            </div>
          </div>

          {errorImagen && (
            <p className="text-[11px] font-bold text-red-400">{errorImagen}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemMenu;