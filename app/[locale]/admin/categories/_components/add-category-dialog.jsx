"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { adminCreateCategory } from "@/app/actions/admin-categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AddCategoryDialog({ open, onOpenChange }) {
    const t = useTranslations("Admin");
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        thumbnail: ""
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            toast.error(t("categoryTitleRequired"));
            return;
        }

        setIsPending(true);
        try {
            await adminCreateCategory(formData);
            toast.success(t("categoryCreated"));
            setFormData({ title: "", description: "", thumbnail: "" });
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error('Create category error:', error);
            toast.error(error?.message || t("failedCreateCategory"));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("addCategory")}</DialogTitle>
                    <DialogDescription>
                        {t("addCategoryDescription")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">{t("categoryTitle")}</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t("categoryTitlePlaceholder")}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t("categoryDescription")}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t("categoryDescriptionPlaceholder")}
                                disabled={isPending}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="thumbnail">{t("categoryThumbnail")}</Label>
                            <Input
                                id="thumbnail"
                                value={formData.thumbnail}
                                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                                placeholder={t("categoryThumbnailPlaceholder")}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? t("creating") : t("create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
