import React, { useState, useRef } from 'react';

type DragDropImageUploaderProps = {
  imageUrl: string;
  onImageChange: (file: File, previewUrl: string) => void;
};

export default function DragDropImageUploader({ imageUrl, onImageChange }: DragDropImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger file input dialog
  const handleClick = () => {
    inputRef.current?.click();
  };

  // When user selects a file from file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      onImageChange(file, previewUrl);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const previewUrl = URL.createObjectURL(file);
      onImageChange(file, previewUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: '2px dashed #aaa',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        borderColor: dragOver ? '#333' : '#aaa',
        borderRadius: '8px',
        userSelect: 'none',
        position: 'relative',
      }}
      aria-label="Upload image by clicking or dragging and dropping"
      role="button"
      tabIndex={0}
      onKeyPress={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Uploaded preview"
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6 }}
        />
      ) : (
        <p style={{ color: '#666' }}>Click or drag & drop an image here</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
