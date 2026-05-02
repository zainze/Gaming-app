import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Banner {
  id: string;
  image: string;
  title: string;
  active: boolean;
}

export const BannerSlider: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "banners"), where("active", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));
      setBanners(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "banners");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full aspect-[21/7] overflow-hidden rounded-3xl group shadow-lg shadow-black/5">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img 
            src={banners[currentIndex].image} 
            alt={banners[currentIndex].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex flex-col justify-center px-6">
             <motion.h2 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-white font-black italic uppercase tracking-tighter text-lg leading-tight w-2/3"
             >
               {banners[currentIndex].title}
             </motion.h2>
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="mt-2"
             >
                <div className="bg-orange-500 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest inline-block shadow-lg shadow-orange-500/20">
                  Play Now
                </div>
             </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-6 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-orange-500' : 'w-1 bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {/* Nav Buttons */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
};
