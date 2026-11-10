import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CoverImageKind } from "@domain/media/coverImages.types";
import { COVER_GUIDE_BAND_ASPECT, IMAGE_ASPECT } from "@domain/media/imageAspect";
import { useCoverImageUpload } from "@hooks/useCoverImageUpload";
import { Button } from "@components/ui/Button";
import { buttonClassName } from "@components/ui/buttonStyles";
import { Icon } from "@components/ui/Icon";
import { ImageCropDialog } from "./ImageCropDialog";
interface Props {
  kind: CoverImageKind;
  value?: string | null;
  onChange: (value: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}
export function CoverImagePicker({ kind, value, onChange, onBusyChange }: Props) {
  const { t } = useTranslation();
  const upload = useCoverImageUpload(kind, value, onChange, onBusyChange);
  return <><section onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!upload.busy) upload.pick(event.dataTransfer.files[0]); }} className="space-y-3 rounded-2xl border border-wine-700/15 bg-wine-700/5 p-4">
    <p className="text-sm font-semibold">{t("media.cover")}</p>
    {value && upload.preview && <img src={upload.preview} alt="" className="h-40 w-full rounded-xl object-cover" />}
    <div className="flex items-center gap-3">
      <label className={buttonClassName({ variant: "secondary", className: `focus-within:ring-2 focus-within:ring-wine-500 focus-within:ring-offset-2 ${upload.busy ? "opacity-50" : "cursor-pointer"}` })}>
        <Icon icon={ImagePlus} size="md" />{t(value ? "media.replace" : "media.choose")}
        <input type="file" className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp" disabled={upload.busy}
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; upload.pick(file); }} />
      </label>
      {value && <Button type="button" variant="ghost" disabled={upload.busy} onClick={() => onChange(null)} leftIcon={<Icon icon={Trash2} />}>{t("media.remove")}</Button>}
    </div>
    <p className="text-xs text-gray-500">{t("media.dropHint")}</p>
    <p className="text-xs text-gray-500" role="status">{t(upload.busy ? "media.uploading" : "media.hint")}</p>
    {upload.error && <p role="alert" className="text-sm text-danger">{upload.error}</p>}
  </section>
  {upload.cropping && <ImageCropDialog image={upload.cropping} aspect={IMAGE_ASPECT.COVER} guideBandAspect={COVER_GUIDE_BAND_ASPECT}
    onConfirm={upload.confirmCrop} onCancel={upload.cancelCrop} />}
  </>;
}
