import React from 'react';
import { Camera } from 'lucide-react';

const PhotoGallery = ({ workOrders, vehiclePhotos }) => {

  const allPhotos = [
    ...vehiclePhotos.map(p => ({ url: p, type: 'Veículo', date: null })),
    ...workOrders.flatMap(os => 
      os.work_order_photos.map(photo => ({
        url: photo.photo_url,
        type: photo.photo_type === 'before' ? 'Antes' : 'Depois',
        date: os.order_date,
        osId: os.id
      }))
    )
  ].sort((a,b) => (b.date || 0) - (a.date || 0));

  return (
    <div className="pt-4">
      {allPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed rounded-lg">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhuma foto encontrada.</p>
          <p className="text-gray-400 text-sm">Fotos do veículo e das ordens de serviço aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allPhotos.map((photo, index) => (
            <div key={index} className="group relative rounded-lg overflow-hidden">
              <img-replace src={photo.url} alt={`${photo.type} - ${photo.date ? new Date(photo.date).toLocaleDateString() : 'Foto do Veículo'}`} className="w-full h-40 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
                <p className="font-bold">{photo.type}</p>
                {photo.date && <p>{new Date(photo.date).toLocaleDateString()}</p>}
                {photo.osId && <p>OS #{String(photo.osId).substring(0,4)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;