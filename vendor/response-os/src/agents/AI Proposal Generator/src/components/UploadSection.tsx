import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useTranslation } from "@nss/proposal-i18n";

interface UploadSectionProps {
  photos: File[];
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}

const UploadSection = ({ photos, onUpload, onRemove }: UploadSectionProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const previews = useMemo(
    () => photos.map((photo) => ({ name: photo.name, url: URL.createObjectURL(photo) })),
    [photos]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  return (
    <section className="glass-card upload-panel reveal">
      <div className="panel-head-row">
        <h3 className="panel-title">
          <Camera size={20} /> {t("section.upload")}
        </h3>
        <span className="panel-badge">{photos.length} photo(s)</span>
      </div>
      <p className="panel-subtitle">
        Include overview and close-up photos to improve scope detection.
      </p>

      <button
        type="button"
        className={`upload-dropzone ${isDragActive ? "drag-active" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          onUpload(event.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          id="photo-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => onUpload(event.target.files)}
          hidden
        />
        <Camera size={46} strokeWidth={1.5} />
        <p className="upload-copy-primary">Click to upload or drag and drop</p>
        <p className="upload-copy-secondary">Photos improve estimate quality and scope detail.</p>
      </button>

      {previews.length > 0 ? (
        <div className="photo-grid" role="list" aria-label="Uploaded photos">
          {previews.map((preview, index) => (
            <div key={`${preview.name}-${index}`} className="photo-tile" role="listitem">
              <img src={preview.url} alt={`Uploaded job photo ${index + 1}`} loading="lazy" />
              <button
                type="button"
                className="photo-remove"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(index);
                }}
                aria-label={`Remove photo ${index + 1}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default UploadSection;

