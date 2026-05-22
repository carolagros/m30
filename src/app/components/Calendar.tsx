import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Photo {
  id: number;
  url: string;
  rotation: number;
  top: string;
  left: string;
  monthIndex: number;
}

const monthNames = [
  'gener', 'febrer', 'març', 'abril', 'maig', 'juny',
  'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'
];

const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// Función para obtener los días de un mes
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Función para obtener el primer día de la semana del mes (0 = domingo)
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Verificar si dos fotos se superponen considerando la rotación
function doPhotosOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
  minGap: number = 3
): boolean {
  // Añadir margen de seguridad para rotaciones
  const safetyMargin = minGap;
  return !(
    x1 + w1 + safetyMargin < x2 ||
    x2 + w2 + safetyMargin < x1 ||
    y1 + h1 + safetyMargin < y2 ||
    y2 + h2 + safetyMargin < y1
  );
}

// Generar todas las fotos del año (80 para el carrusel, 20 para mostrar)
function generatePhotos(year: number): Photo[] {
  const basePhotos = [
    'https://images.unsplash.com/photo-1763655396188-82015c2dab72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZyaWVuZHMlMjBnYXRoZXJpbmd8ZW58MXx8fHwxNzc4MzEwNDgzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1695425812104-8a9963d58887?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHZhY2F0aW9uJTIwc3Vuc2V0fGVufDF8fHx8MTc3ODMxMDQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1605650836938-9925888f7321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjBkaW5uZXIlMjBjZWxlYnJhdGlvbnxlbnwxfHx8fDE3NzgzMTA0ODN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1595368062405-e4d7840cba14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGhpa2luZyUyMGFkdmVudHVyZXxlbnwxfHx8fDE3NzgxOTAzMjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1613491963112-bf2644f76c6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaXJ0aGRheSUyMHBhcnR5JTIwY2FrZXxlbnwxfHx8fDE3NzgzMTA0ODR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1631225893179-4d6e349189c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBjb3VwbGV8ZW58MXx8fHwxNzc4MzEwNDg1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1702533586864-f548c237fe04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbmlnaHRsaWZlJTIwbGlnaHRzfGVufDF8fHx8MTc3ODMxMDQ4NXww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1725573839642-f4a6ec92798f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdW1tZXIlMjBwaWNuaWMlMjBwYXJrfGVufDF8fHx8MTc3ODMxMDQ4Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1648260029310-5f1da359af9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwZmVzdGl2YWwlMjBjcm93ZHxlbnwxfHx8fDE3NzgzMTA0ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1606203426721-0dffb32bdf83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW50ZXIlMjBzbm93JTIwc2xlZGRpbmd8ZW58MXx8fHwxNzc4MzEwNDg2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1675887923978-d7079d2e2ca2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFkdWF0aW9uJTIwY2VyZW1vbnklMjBoYXBweXxlbnwxfHx8fDE3NzgzMTA0ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  ];

  const allPhotos: Photo[] = [];
  const placedPhotos: Array<{ x: number; y: number; w: number; h: number }> = [];

  // Tamaño de las fotos en porcentaje del contenedor
  const photoWidth = 6;  // Aumentado para mejor visibilidad
  const photoHeight = 8;

  // Generar solo 20 fotos para mostrar en el calendario
  let attempts = 0;
  const maxAttempts = 2000;
  const photosToPlace = 20;

  for (let i = 0; i < photosToPlace && attempts < maxAttempts; i++) {
    let placed = false;
    let localAttempts = 0;

    while (!placed && localAttempts < 200) {
      // Generar posición aleatoria dentro de los límites seguros
      const x = 3 + Math.random() * (93 - photoWidth);
      const y = 8 + Math.random() * (88 - photoHeight);

      // Verificar si no se superpone con ninguna foto ya colocada
      let overlaps = false;
      for (const existing of placedPhotos) {
        if (doPhotosOverlap(x, y, photoWidth, photoHeight, existing.x, existing.y, existing.w, existing.h, 3)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        const monthIndex = Math.floor(i / 2);
        const rotation = Math.random() * 24 - 12; // Entre -12 y 12 grados para más variedad

        allPhotos.push({
          id: i + 1,
          url: basePhotos[i % basePhotos.length],
          rotation,
          top: `${y}%`,
          left: `${x}%`,
          monthIndex: monthIndex < 12 ? monthIndex : 11,
        });

        placedPhotos.push({ x, y, w: photoWidth, h: photoHeight });
        placed = true;
      }

      localAttempts++;
      attempts++;
    }
  }

  // Generar las 60 fotos restantes para el carrusel (sin posición en el calendario)
  for (let i = 20; i < 80; i++) {
    const monthIndex = Math.floor(i / 7);
    allPhotos.push({
      id: i + 1,
      url: basePhotos[i % basePhotos.length],
      rotation: 0,
      top: '0%',
      left: '0%',
      monthIndex: monthIndex < 12 ? monthIndex : 11,
    });
  }

  return allPhotos;
}

interface MonthProps {
  year: number;
  monthIndex: number;
}

function Month({ year, monthIndex }: MonthProps) {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDay = getFirstDayOfMonth(year, monthIndex);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  return (
    <div className="flex flex-col gap-1">
      {/* Nombre del mes */}
      <h3 className="text-[#E74C3C] text-[10px] md:text-sm font-normal lowercase tracking-wide mb-0.5">
        {monthNames[monthIndex]}
      </h3>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-x-1 text-[#9CA3AF] text-[8px] md:text-[10px] font-normal text-center mb-0.5">
        {dayNames.map((day, i) => (
          <div key={i}>{day}</div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-[#374151] text-[8px] md:text-[10px] text-center font-normal">
        {/* Espacios vacíos antes del primer día */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Días del mes */}
        {days.map(day => (
          <div key={day} className="leading-tight">
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

interface YearCardProps {
  year: number;
  photos: Photo[];
  allPhotos: Photo[];
  onPhotoClick: (photo: Photo, allPhotos: Photo[]) => void;
  scale?: number;
  opacity?: number;
}

function YearCard({ year, photos, allPhotos, onPhotoClick, scale = 1, opacity = 1 }: YearCardProps) {
  return (
    <div
      className="relative bg-white rounded-none md:rounded-none overflow-visible"
      style={{
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: 'center center'
      }}
    >
      {/* Grid de meses */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 md:gap-x-6 md:gap-y-8 px-2 py-4 md:px-8 md:py-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <Month key={i} year={year} monthIndex={i} />
        ))}
      </div>

      {/* Fotos tipo stickers - primeras 20 que tienen posición */}
      {photos.slice(0, 20).map(photo => (
        <motion.div
          key={photo.id}
          className="absolute cursor-pointer"
          style={{
            top: photo.top,
            left: photo.left,
            transform: `rotate(${photo.rotation}deg)`,
            transformOrigin: 'center center',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPhotoClick(photo, allPhotos)}
        >
          <div className="w-[56px] h-[72px] md:w-[64px] md:h-[84px] overflow-hidden pointer-events-none">
            <img
              src={photo.url}
              alt={`Foto ${photo.id}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Calendar() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [allYearPhotos, setAllYearPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(1); // 0: año anterior, 1: actual, 2: siguiente

  // Generar fotos para los tres años
  const [photosMap] = useState(() => ({
    [selectedYear - 1]: generatePhotos(selectedYear - 1),
    [selectedYear]: generatePhotos(selectedYear),
    [selectedYear + 1]: generatePhotos(selectedYear + 1),
  }));

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePrevYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.x > threshold && carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1);
    } else if (info.offset.x < -threshold && carouselIndex < 2) {
      setCarouselIndex(prev => prev + 1);
    }
  };

  const handlePhotoClick = (photo: Photo, allPhotos: Photo[]) => {
    setSelectedPhoto(photo);
    setAllYearPhotos(allPhotos);
    const index = allPhotos.findIndex(p => p.id === photo.id);
    setCurrentPhotoIndex(index);
  };

  const handleCarouselDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;

    if (info.offset.x > threshold && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    } else if (info.offset.x < -threshold && currentPhotoIndex < allYearPhotos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
    setAllYearPhotos([]);
  };

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-4 md:p-8">
      {/* Vista Desktop */}
      {!isMobile ? (
        <div className="w-full max-w-4xl" style={{ height: '75vh' }}>
          {/* Navegación */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <button
              onClick={handlePrevYear}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#E74C3C] flex items-center justify-center hover:bg-[#E74C3C]/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-[#E74C3C]" />
            </button>

            <h1 className="text-5xl md:text-7xl italic text-[#E74C3C]" style={{ fontFamily: 'Instrument Serif, serif' }}>
              {selectedYear}
            </h1>

            <button
              onClick={handleNextYear}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#E74C3C] flex items-center justify-center hover:bg-[#E74C3C]/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-[#E74C3C]" />
            </button>
          </div>

          {/* Tarjeta del año */}
          <YearCard
            year={selectedYear}
            photos={photosMap[selectedYear] || generatePhotos(selectedYear)}
            allPhotos={photosMap[selectedYear] || generatePhotos(selectedYear)}
            onPhotoClick={handlePhotoClick}
          />
        </div>
      ) : (
        /* Vista Mobile */
        <div className="w-full flex flex-col items-center" style={{ height: '75vh' }}>
          {/* Navegación móvil */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={handlePrevYear}
              className="w-10 h-10 rounded-full border-2 border-[#E74C3C] flex items-center justify-center hover:bg-[#E74C3C]/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#E74C3C]" />
            </button>

            <h1 className="text-5xl italic text-[#E74C3C]" style={{ fontFamily: 'Instrument Serif, serif' }}>
              {selectedYear}
            </h1>

            <button
              onClick={handleNextYear}
              className="w-10 h-10 rounded-full border-2 border-[#E74C3C] flex items-center justify-center hover:bg-[#E74C3C]/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#E74C3C]" />
            </button>
          </div>

          {/* Tarjeta del año */}
          <div className="w-full max-w-md">
            <YearCard
              year={selectedYear}
              photos={photosMap[selectedYear] || generatePhotos(selectedYear)}
              allPhotos={photosMap[selectedYear] || generatePhotos(selectedYear)}
              onPhotoClick={handlePhotoClick}
            />
          </div>
        </div>
      )}

      {/* Modal carousel para fotos */}
      <AnimatePresence>
        {selectedPhoto && allYearPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center"
            onClick={handleCloseModal}
          >
            {/* Botón de cerrar */}
            <button
              className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-20"
              onClick={handleCloseModal}
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Contador de fotos */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm md:text-base z-20">
              {currentPhotoIndex + 1} / {allYearPhotos.length}
            </div>

            {/* Contenedor de imagen con navegación por swipe */}
            <div className="w-full h-full flex items-center justify-center p-6 md:p-12" onClick={(e) => e.stopPropagation()}>
              <motion.div
                key={currentPhotoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-full h-full flex items-center justify-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleCarouselDragEnd}
              >
                <img
                  src={allYearPhotos[currentPhotoIndex].url}
                  alt={`Foto ${currentPhotoIndex + 1}`}
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                />
              </motion.div>
            </div>

            {/* Botones de navegación - Siempre visibles */}
            {currentPhotoIndex > 0 && (
              <button
                className="absolute left-4 md:left-8 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(prev => prev - 1);
                }}
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            )}
            {currentPhotoIndex < allYearPhotos.length - 1 && (
              <button
                className="absolute right-4 md:right-8 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(prev => prev + 1);
                }}
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
