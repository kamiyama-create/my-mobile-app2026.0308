export const getResizedBase64 = (file: File, maxSide: number, quality: number): Promise<{ base64: string; type: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSide) {
          height *= maxSide / width;
          width = maxSide;
        }
      } else {
        if (height > maxSide) {
          width *= maxSide / height;
          height = maxSide;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({
        base64: dataUrl.split(',')[1],
        type: 'image/jpeg'
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };
    img.src = url;
  });
};
