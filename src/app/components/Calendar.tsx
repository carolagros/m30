import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import photoManifest from '../../photo-manifest.json';
import fallbackImageA from '../../imports/image.png';
import fallbackImageB from '../../imports/image-1.png';
import fallbackImageC from '../../imports/image-2.png';

type PhotoRecord = {
  src: string;
  year: number;
  month: number;
  source: string;
  date: string | null;
};

type PhotoVariant = 'thumbs' | 'large';

const photos = photoManifest as PhotoRecord[];
const YEARS = Array.from({ length: 31 }, (_, index) => 1996 + index);
const BIRTHDAY_YEARS = YEARS.slice(0, 30);
const MIN_YEAR = YEARS[0];
const MAX_YEAR = YEARS[YEARS.length - 1];
const FINAL_YEAR = 2026;
const FINAL_YEAR_LAST_MONTH = 4;
const YOUTUBE_URL = 'https://www.youtube.com/';

const firebaseImages = {
  bucket: 'm30-calendar.firebasestorage.app',
  root: 'm30-calendar',
  version: '2026-05-24-2',
};

const unavailablePhotoSrcs = new Set(['src/pics/1997/1 -escanear0038 2.jpg']);
const fallbackImages = [fallbackImageA, fallbackImageB, fallbackImageC];
const monthNames = [
  'gener',
  'febrer',
  'març',
  'abril',
  'maig',
  'juny',
  'juliol',
  'agost',
  'setembre',
  'octubre',
  'novembre',
  'desembre',
];
const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const thirtyPositions = [
  { x: 8, y: 10 }, { x: 18, y: 6 }, { x: 29, y: 10 },
  { x: 34, y: 22 }, { x: 32, y: 35 }, { x: 22, y: 42 },
  { x: 32, y: 50 }, { x: 36, y: 64 }, { x: 30, y: 77 },
  { x: 18, y: 83 }, { x: 8, y: 78 }, { x: 21, y: 22 },
  { x: 24, y: 62 }, { x: 14, y: 45 }, { x: 30, y: 90 },
  { x: 59, y: 8 }, { x: 70, y: 5 }, { x: 80, y: 10 },
  { x: 88, y: 24 }, { x: 90, y: 40 }, { x: 89, y: 57 },
  { x: 84, y: 74 }, { x: 74, y: 84 }, { x: 62, y: 83 },
  { x: 52, y: 72 }, { x: 48, y: 55 }, { x: 48, y: 37 },
  { x: 52, y: 20 }, { x: 68, y: 45 }, { x: 78, y: 57 },
];

const scatterPositions = [
  { x: 13, y: 8 }, { x: 34, y: 10 }, { x: 55, y: 8 },
  { x: 88, y: 8 }, { x: 22, y: 21 }, { x: 48, y: 17 },
  { x: 78, y: 18 }, { x: 10, y: 30 }, { x: 35, y: 30 },
  { x: 65, y: 29 }, { x: 88, y: 30 }, { x: 18, y: 42 },
  { x: 35, y: 38 }, { x: 82, y: 42 }, { x: 12, y: 54 },
  { x: 43, y: 59 }, { x: 77, y: 57 }, { x: 20, y: 68 },
  { x: 52, y: 66 }, { x: 86, y: 68 }, { x: 14, y: 78 },
  { x: 36, y: 82 }, { x: 62, y: 78 }, { x: 86, y: 83 },
  { x: 24, y: 90 }, { x: 50, y: 91 }, { x: 72, y: 88 },
  { x: 90, y: 91 }, { x: 63, y: 19 }, { x: 31, y: 73 },
];

function thirtyStartInViewport(position: { x: number; y: number }) {
  return {
    x: 12 + position.x * 0.78,
    y: 38 + position.y * 0.23,
  };
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function firstDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).getDay();
}

function stableNumber(text: string, salt = 0) {
  let hash = 2166136261 + salt;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function basePhotosForYear(year: number) {
  return photos
    .filter(
      (photo) =>
        photo.year === year &&
        !unavailablePhotoSrcs.has(photo.src) &&
        /\.(jpe?g|png)$/i.test(photo.src),
    )
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.src.localeCompare(b.src));
}

function normalizeFinalYearPhotoMonths(yearPhotos: PhotoRecord[]) {
  const metadataPhotos = yearPhotos
    .filter(hasUsableMetadata)
    .map((photo) => ({ ...photo, month: Math.min(FINAL_YEAR_LAST_MONTH, photo.month) }));
  const flexiblePhotos = yearPhotos.filter((photo) => !hasUsableMetadata(photo));

  return [
    ...metadataPhotos,
    ...flexiblePhotos.map((photo, index) => ({
      ...photo,
      month: index % (FINAL_YEAR_LAST_MONTH + 1),
    })),
  ];
}

function photosForYear(year: number) {
  const yearPhotos = basePhotosForYear(year);
  const displayPhotos = year === FINAL_YEAR ? normalizeFinalYearPhotoMonths(yearPhotos) : yearPhotos;

  return displayPhotos.sort(
    (a, b) =>
      a.month - b.month ||
      Number(b.source === 'metadata') - Number(a.source === 'metadata') ||
      (a.date || '').localeCompare(b.date || '') ||
      a.src.localeCompare(b.src),
  );
}

function hasUsableMetadata(photo: PhotoRecord) {
  return photo.source === 'metadata' && Boolean(photo.date);
}

function metadataDay(photo: PhotoRecord, year: number, monthIndex: number) {
  if (!hasUsableMetadata(photo) || !photo.date) return null;
  const [dateYear, dateMonth, dateDay] = photo.date.split('-').map(Number);
  if (dateYear !== year || dateMonth !== monthIndex + 1 || !dateDay) return null;
  return Math.min(daysInMonth(year, monthIndex), Math.max(1, dateDay));
}

function sortedMonthPhotos(yearPhotos: PhotoRecord[], monthIndex: number) {
  return yearPhotos
    .filter((photo) => photo.month === monthIndex)
    .sort(
      (a, b) =>
        Number(hasUsableMetadata(b)) - Number(hasUsableMetadata(a)) ||
        (a.date || '').localeCompare(b.date || '') ||
        a.src.localeCompare(b.src),
    );
}

function coverPhotoForYear(year: number) {
  const yearPhotos = photosForYear(year);
  return (
    yearPhotos.find((photo) => /\/0[-\s]/i.test(photo.src)) ||
    yearPhotos.find((photo) => photo.source === 'metadata') ||
    yearPhotos[0]
  );
}

function firebaseImageUrl(photo: PhotoRecord, variant: PhotoVariant) {
  const objectPath = `${firebaseImages.root}/${variant}/${photo.src}.jpg`;
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseImages.bucket}/o/${encodeURIComponent(
    objectPath,
  )}?alt=media&v=${encodeURIComponent(firebaseImages.version)}`;
}

function fallbackFor(photo: PhotoRecord | undefined, fallbackIndex = 0) {
  if (!photo) return fallbackImages[fallbackIndex % fallbackImages.length];
  return fallbackImages[(photo.year + photo.month + fallbackIndex) % fallbackImages.length];
}

function photoAlt(photo: PhotoRecord | undefined, fallbackLabel: string) {
  if (!photo) return fallbackLabel;
  return `Foto de ${monthNames[photo.month] || 'un mes'} de ${photo.year}`;
}

function PhotoImage({
  photo,
  variant = 'thumbs',
  className,
  fallbackIndex = 0,
  loading = 'lazy',
}: {
  photo?: PhotoRecord;
  variant?: PhotoVariant;
  className?: string;
  fallbackIndex?: number;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);
  const src = photo && !failed ? firebaseImageUrl(photo, variant) : fallbackFor(photo, fallbackIndex);

  useEffect(() => {
    setFailed(false);
  }, [photo?.src, variant]);

  return (
    <img
      src={src}
      alt={photoAlt(photo, 'Foto de celebració')}
      className={className}
      loading={loading}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function ThirtyPhotoMark({
  onEnter,
  enabled,
  compact = false,
}: {
  onEnter?: () => void;
  enabled?: boolean;
  compact?: boolean;
}) {
  const heroPhotos = useMemo(
    () => BIRTHDAY_YEARS.map((year) => coverPhotoForYear(year)).filter(Boolean) as PhotoRecord[],
    [],
  );

  return (
    <motion.div
      className={
        compact
          ? 'm30-thirty m30-thirty--compact m30-thirty--clickable'
          : 'm30-thirty m30-thirty--clickable'
      }
      aria-hidden={enabled ? undefined : true}
      aria-label={enabled ? 'Obrir el regal' : undefined}
      role={enabled ? 'button' : undefined}
      tabIndex={enabled ? 0 : undefined}
      onClick={enabled ? onEnter : undefined}
      onKeyDown={(event) => {
        if (!enabled || !onEnter) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEnter();
        }
      }}
      whileTap={enabled ? { scale: 0.98 } : undefined}
    >
      {thirtyPositions.map((position, index) => {
        const photo = heroPhotos[index % heroPhotos.length];
        const rotation = -9 + stableNumber(`${photo?.src || index}`, 11) * 18;
        return (
          <motion.div
            key={`${photo?.src || index}-${index}`}
            className="m30-thirty__photo"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              rotate: `${rotation}deg`,
            }}
            initial={{ opacity: 0, scale: 0.2, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.035, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.18, zIndex: 10 }}
          >
            <PhotoImage
              photo={photo}
              fallbackIndex={index}
              className="m30-thirty__image"
              loading={index < 8 ? 'eager' : 'lazy'}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function IntroGate({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.section
      className="m30-intro"
      aria-label="Portada del regal"
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="m30-intro__copy">
        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55 }}>
          Moltes Felicitats!
        </motion.p>
        <motion.span
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: [0, -8, 0], opacity: 1 }}
          transition={{
            opacity: { delay: 0.18, duration: 0.45 },
            y: { delay: 0.65, duration: 1.15, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          Clica per obrir el regal!
        </motion.span>
      </div>
      <motion.div
        className="m30-intro__arrow"
        aria-hidden="true"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 52, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.55 }}
      />
      <ThirtyPhotoMark onEnter={onEnter} enabled compact />
    </motion.section>
  );
}

function OpeningHero() {
  const heroPhotos = useMemo(
    () => BIRTHDAY_YEARS.map((year) => coverPhotoForYear(year)).filter(Boolean) as PhotoRecord[],
    [],
  );

  return (
    <section className="m30-hero" aria-label="M30">
      <div className="m30-scatter" aria-hidden="true">
        {scatterPositions.map((position, index) => {
          const photo = heroPhotos[index % heroPhotos.length];
          const start = thirtyStartInViewport(thirtyPositions[index]);
          const rotation = -13 + stableNumber(`${photo?.src || index}`, 31) * 26;

          return (
            <motion.div
              key={`${photo?.src || index}-scatter-${index}`}
              className="m30-scatter__photo"
              style={{
                left: `${start.x}%`,
                top: `${start.y}%`,
                rotate: '0deg',
              }}
              initial={{ opacity: 0.95, scale: 0.82 }}
              animate={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                opacity: 1,
                scale: 1,
                rotate: `${rotation}deg`,
              }}
              transition={{
                delay: 0.08 + index * 0.015,
                duration: 1.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <PhotoImage
                photo={photo}
                fallbackIndex={index}
                className="m30-scatter__image"
                loading={index < 10 ? 'eager' : 'lazy'}
              />
            </motion.div>
          );
        })}
      </div>
      <div className="m30-hero__copy">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.55 }}
        >
          Marion ¿GRAN?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            opacity: { duration: 0.5, delay: 0.78 },
            y: { duration: 0.5, delay: 0.78 },
          }}
        >
          is turning 30
        </motion.p>
      </div>
      <motion.div
        className="m30-hero__hint"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.45, duration: 0.55 }}
      >
        <span>Swipe pels més cotilles</span>
        <i aria-hidden="true" />
      </motion.div>
    </section>
  );
}

function BirthdayCarousel() {
  const railRef = useRef<HTMLDivElement>(null);
  const cards = useMemo(
    () =>
      BIRTHDAY_YEARS.map((year, index) => ({
        year,
        age: index + 1,
        photo: coverPhotoForYear(year),
      })),
    [],
  );

  const scrollCarousel = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(168, rail.clientWidth * 0.72),
      behavior: 'smooth',
    });
  };

  return (
    <section className="m30-section m30-birthdays" aria-label="Carrusel de 30 aniversaris">
      <h2>Des de la primera espelma fins a la número 30</h2>
      <div className="m30-birthdays__carousel">
        <button
          className="m30-birthdays__arrow m30-birthdays__arrow--left"
          type="button"
          onClick={() => scrollCarousel(-1)}
          aria-label="Fotos anteriors"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="m30-birthdays__rail" ref={railRef} tabIndex={0}>
          {cards.map((card, index) => (
            <article
              className="m30-polaroid"
              key={card.year}
              style={{ rotate: `${-4 + (index % 5) * 2}deg` }}
            >
              <PhotoImage
                photo={card.photo}
                className="m30-polaroid__image"
                fallbackIndex={index}
                loading={index < 5 ? 'eager' : 'lazy'}
              />
              <div className="m30-polaroid__caption">
                <span>{card.year}</span>
              </div>
            </article>
          ))}
          <article className="m30-polaroid m30-polaroid--mystery" style={{ rotate: '1deg' }}>
            <div className="m30-polaroid__mystery">???????</div>
            <div className="m30-polaroid__caption">
              <span>2026</span>
            </div>
          </article>
        </div>
        <button
          className="m30-birthdays__arrow m30-birthdays__arrow--right"
          type="button"
          onClick={() => scrollCarousel(1)}
          aria-label="Fotos seguents"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

type MonthPhotoStyle = CSSProperties & { '--m30-photo-size': string };

function monthPhotoStyle(
  photo: PhotoRecord,
  index: number,
  monthPhotos: PhotoRecord[],
  year: number,
  monthIndex: number,
): MonthPhotoStyle {
  const count = monthPhotos.length;
  const metadata = metadataDay(photo, year, monthIndex);
  const columns = count > 14 ? 5 : count > 8 ? 4 : count > 4 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(count / columns));
  const size = count > 14 ? 18 : count > 8 ? 21 : count > 4 ? 24 : 29;
  const jitterX = -4 + stableNumber(photo.src, index + 41) * 8;
  const jitterY = -3 + stableNumber(photo.src, index + 59) * 6;
  const rotation = -9 + stableNumber(photo.src, index + 83) * 18;

  let left: number;
  let top: number;

  if (metadata) {
    const gridIndex = firstDayOfMonth(year, monthIndex) + metadata - 1;
    const weekday = gridIndex % 7;
    const week = Math.floor(gridIndex / 7);
    const sameDayIndex = monthPhotos
      .slice(0, index)
      .filter((item) => metadataDay(item, year, monthIndex) === metadata).length;
    left = ((weekday + 0.5) / 7) * 100 + jitterX + ((sameDayIndex % 3) - 1) * 18;
    top = 30 + ((week + 0.5) / 6) * 58 + jitterY + Math.floor(sameDayIndex / 3) * 7;
  } else {
    const column = index % columns;
    const row = Math.floor(index / columns);
    left = ((column + 0.5) / columns) * 100 + jitterX;
    top = 30 + ((row + 0.5) / rows) * 62 + jitterY;
  }

  return {
    '--m30-photo-size': `${size}px`,
    left: `${Math.max(9, Math.min(91, left))}%`,
    top: `${Math.max(24, Math.min(91, top))}%`,
    rotate: `${rotation}deg`,
    zIndex: 20 + index,
  };
}

function Month({
  year,
  monthIndex,
  photos: monthPhotos,
  allYearPhotos,
  onPhotoClick,
}: {
  year: number;
  monthIndex: number;
  photos: PhotoRecord[];
  allYearPhotos: PhotoRecord[];
  onPhotoClick: (photo: PhotoRecord, photos: PhotoRecord[]) => void;
}) {
  const days = Array.from({ length: daysInMonth(year, monthIndex) }, (_, index) => index + 1);
  const firstDay = firstDayOfMonth(year, monthIndex);

  return (
    <section className="m30-month" aria-label={monthNames[monthIndex]}>
      <h3>{monthNames[monthIndex]}</h3>
      <div className="m30-month__weekdays">
        {dayNames.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="m30-month__days">
        {Array.from({ length: firstDay }).map((_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {days.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="m30-month__photos" aria-label={`Fotos de ${monthNames[monthIndex]} ${year}`}>
        {monthPhotos.map((photo, index) => (
          <motion.button
            type="button"
            key={`${photo.src}-${index}`}
            className="m30-month-photo"
            style={monthPhotoStyle(photo, index, monthPhotos, year, monthIndex)}
            aria-label={`Obrir foto ${index + 1} de ${monthNames[monthIndex]} ${year}`}
            title={
              hasUsableMetadata(photo) && photo.date
                ? `${monthNames[monthIndex]} ${year} · ${photo.date}`
                : `${monthNames[monthIndex]} ${year} · repartida aleatòriament`
            }
            onClick={() => onPhotoClick(photo, allYearPhotos)}
            whileHover={{ scale: 1.3, zIndex: 200 }}
            whileTap={{ scale: 0.95 }}
          >
            <PhotoImage photo={photo} className="m30-month-photo__image" fallbackIndex={index} />
            <span
              className={hasUsableMetadata(photo) ? 'm30-month-photo__dot' : 'm30-month-photo__dot m30-month-photo__dot--random'}
              aria-hidden="true"
            />
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function YearCalendar({
  year,
  onPhotoClick,
}: {
  year: number;
  onPhotoClick: (photo: PhotoRecord, photos: PhotoRecord[]) => void;
}) {
  const yearPhotos = useMemo(() => photosForYear(year), [year]);

  return (
    <motion.div
      className="m30-calendar-card"
      key={year}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="m30-calendar-card__months">
        {monthNames.map((_, index) => (
          <Month
            key={index}
            year={year}
            monthIndex={index}
            photos={sortedMonthPhotos(yearPhotos, index)}
            allYearPhotos={yearPhotos}
            onPhotoClick={onPhotoClick}
          />
        ))}
      </div>
    </motion.div>
  );
}

function CalendarSection() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [modalPhotos, setModalPhotos] = useState<PhotoRecord[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const openPhoto = (photo: PhotoRecord, yearPhotos: PhotoRecord[]) => {
    setSelectedPhoto(photo);
    setModalPhotos(yearPhotos);
    setPhotoIndex(Math.max(0, yearPhotos.findIndex((item) => item.src === photo.src)));
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    setModalPhotos([]);
    setPhotoIndex(0);
  };

  const stepPhoto = (direction: number) => {
    setPhotoIndex((current) => Math.max(0, Math.min(modalPhotos.length - 1, current + direction)));
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 60) stepPhoto(-1);
    if (info.offset.x < -60) stepPhoto(1);
  };

  const currentModalPhoto = modalPhotos[photoIndex] || selectedPhoto || undefined;

  return (
    <section className="m30-section m30-years" aria-label="Calendari per anys">
      <h2>30 anys donen molt de si...</h2>
      <div className="m30-year-nav" aria-label="Navegacio per anys">
        <button
          type="button"
          onClick={() => setSelectedYear((year) => Math.max(MIN_YEAR, year - 1))}
          disabled={selectedYear === MIN_YEAR}
          aria-label="Any anterior"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <span>{selectedYear}</span>
        <button
          type="button"
          onClick={() => setSelectedYear((year) => Math.min(MAX_YEAR, year + 1))}
          disabled={selectedYear === MAX_YEAR}
          aria-label="Any següent"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <YearCalendar year={selectedYear} onPhotoClick={openPhoto} />

      <AnimatePresence>
        {selectedPhoto ? (
          <motion.div
            className="m30-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Galeria de fotos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePhoto}
          >
            <button className="m30-modal__close" type="button" onClick={closePhoto} aria-label="Tancar">
              <X aria-hidden="true" />
            </button>
            <div className="m30-modal__counter">
              {photoIndex + 1} / {modalPhotos.length}
            </div>
            <button
              className="m30-modal__arrow m30-modal__arrow--left"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                stepPhoto(-1);
              }}
              disabled={photoIndex === 0}
              aria-label="Foto anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <motion.div
              className="m30-modal__photo-wrap"
              key={photoIndex}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0.7, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PhotoImage photo={currentModalPhoto} variant="large" className="m30-modal__photo" />
            </motion.div>
            <button
              className="m30-modal__arrow m30-modal__arrow--right"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                stepPhoto(1);
              }}
              disabled={photoIndex === modalPhotos.length - 1}
              aria-label="Foto seguent"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function VideoSection() {
  return (
    <section className="m30-section m30-video" aria-label="Vídeo">
      <h2>I tenim unes paraules per tu</h2>
      <a className="m30-video-card" href={YOUTUBE_URL} target="_blank" rel="noreferrer" aria-label="Veure el vídeo a YouTube">
        <span>
          <Play aria-hidden="true" fill="currentColor" />
        </span>
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="m30-footer">
      <p>M30</p>
      <div>
        <span>Dídac, Núria, Carola</span>
        <span>30 de maig del 2026</span>
      </div>
    </footer>
  );
}

export default function Calendar() {
  const [entered, setEntered] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const readyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('m30-lock-scroll', !scrollReady);
    return () => document.documentElement.classList.remove('m30-lock-scroll');
  }, [scrollReady]);

  useEffect(() => {
    return () => {
      if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current);
    };
  }, []);

  const enterPage = () => {
    setEntered(true);
    readyTimerRef.current = window.setTimeout(() => {
      setScrollReady(true);
    }, 2600);
  };

  return (
    <div className="m30-app">
      <AnimatePresence>{!entered ? <IntroGate onEnter={enterPage} /> : null}</AnimatePresence>
      {entered ? (
        <main className="m30-main">
          <OpeningHero />
          <BirthdayCarousel />
          <CalendarSection />
          <VideoSection />
          <Footer />
        </main>
      ) : null}
    </div>
  );
}
