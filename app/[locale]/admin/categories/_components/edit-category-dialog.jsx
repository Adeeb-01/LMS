"use client";

import { useState, useEffect } from "react";
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
import { adminUpdateCategory } from "@/app/actions/admin-categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function EditCategoryDialog({ open, onOpenChange, category }) {
    const t = useTranslations("Admin");
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        thumbnail: ""
    });

    useEffect(() => {
        if (category) {
            setFormData({
                title: category.title || "",
                description: category.description || "",
                thumbnail: category.thumbnail || ""
            });
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            toast.error(t("categoryTitleRequired"));
            return;
        }

        setIsPending(true);
        try {
            await adminUpdateCategory(category.id, formData);
            toast.success(t("categoryUpdated"));
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error('Update category error:', error);
            toast.error(error?.message || t("failedUpdateCategory"));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("editCategory")}</DialogTitle>
                    <DialogDescription>
                        {t("editCategoryDescription")}
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
                            {isPending ? t("updating") : t("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
