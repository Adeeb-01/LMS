"use server";

import { requireAdminPermission } from "@/lib/admin-utils";
import { getCategories, getCategoryDetails } from "@/queries/categories";
import { createCategorySchema, updateCategorySchema } from "@/lib/validations";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { dbConnect } from "@/service/mongo";
import { Category } from "@/model/category-model";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * Get all categories (admin only)
 */
export async function adminGetCategories() {
    try {
        await requireAdminPermission('categories:view');
        return await getCategories();
    } catch (error) {
        console.error('Admin get categories error:', error);
        throw new Error(error?.message || 'Failed to fetch categories');
    }
}

/**
 * Create category (admin only)
 */
export async function adminCreateCategory(data) {
    try {
        await requireAdminPermission('categories:create');
        
        const validation = createCategorySchema.parse(data);
        await dbConnect();
        
        const category = await Category.create(validation);
        
        revalidatePath('/admin/categories');
        return { success: true, category: replaceMongoIdInObject(category) };
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(error.errors.map(e => e.message).join(', '));
        }
        console.error('Admin create category error:', error);
        throw new Error(error?.message || 'Failed to create category');
    }
}

/**
 * Update category (admin only)
 */
export async function adminUpdateCategory(categoryId, data) {
    try {
        await requireAdminPermission('categories:edit');
        
        const validation = updateCategorySchema.parse({ categoryId, ...data });
        await dbConnect();
        
        const category = await Category.findByIdAndUpdate(
            categoryId,
            { $set: data },
            { new: true, lean: true }
        );
        
        if (!category) {
            throw new Error('Category not found');
        }
        
        revalidatePath('/admin/categories');
        return { success: true, category: replaceMongoIdInObject(category) };
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(error.errors.map(e => e.message).join(', '));
        }
        console.error('Admin update category error:', error);
        throw new Error(error?.message || 'Failed to update category');
    }
}

/**
 * Delete category (admin only)
 */
export async function adminDeleteCategory(categoryId) {
    try {
        await requireAdminPermission('categories:delete');
        await dbConnect();
        
        const category = await Category.findByIdAndDelete(categoryId);
        
        if (!category) {
            throw new Error('Category not found');
        }
        
        revalidatePath('/admin/categories');
        return { success: true };
    } catch (error) {
        console.error('Admin delete category error:', error);
        throw new Error(error?.message || 'Failed to delete category');
    }
}

