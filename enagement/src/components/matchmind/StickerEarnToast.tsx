import { toast } from "sonner";

export type EarnedStickerToast = {
  id: string;
  title: string;
  rarity: string;
  imageUrl: string;
  setCompleted?: boolean;
};

export function showStickerEarnToast(sticker: EarnedStickerToast) {
  toast.success(`Sticker unlocked: ${sticker.title}`, {
    description: `${sticker.rarity}${sticker.setCompleted ? " · Set complete! +100 XP" : ""}`,
    duration: 5000,
  });
}
