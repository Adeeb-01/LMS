# Project Cleanup Plan

Comprehensive cleanup plan for removing unused files, dead code, and unused dependencies.

---

## 🔍 ANALYSIS SUMMARY

Based on codebase analysis:
- **Stripe**: Removed and replaced with MockPay (per STRIPE_REMOVAL_CLEANUP_PLAN.md)
- **Example files**: Found unused example/refactor files
- **Documentation**: Several markdown files (can be archived or kept)
- **Dependencies**: Stripe packages still in package.json but not used

---

## 🗑️ FILES TO DELETE

### Category 1: Stripe Files (Confirmed Unused - MockPay Replaces)

**⚠️ IMPORTANT**: Verify MockPay is working before deleting these!

1. **`app/actions/stripe.js`**
   - **Reason**: Replaced by MockPay checkout flow
   - **Status**: ❌ Not imported anywhere (verified)
   - **Action**: DELETE

2. **`lib/stripe.js`**
   - **Reason**: Stripe client initialization, no longer needed
   - **Status**: ❌ Only imported by stripe.js action and webhook
   - **Action**: DELETE

3. **`lib/stripe-helpers.js`**
   - **Reason**: Stripe helper functions, no longer needed
   - **Status**: ❌ Only imported by stripe.js action
   - **Action**: DELETE

4. **`app/api/webhooks/stripe/route.js`**
   - **Reason**: Stripe webhook handler, replaced by MockPay synchronous flow
   - **Status**: ❌ No longer needed per cleanup plan
   - **Action**: DELETE

### Category 2: Example/Test Files

5. **`app/actions/account-updated-example.js`**
   - **Reason**: Example/refactoring demonstration file
   - **Status**: ❌ Not imported anywhere
   - **Action**: DELETE (or move to `_examples/` if you want to keep as reference)

6. **`app/api/upload-updated-example/route.js`**
   - **Reason**: Example/refactoring demonstration file
   - **Status**: ❌ Not imported anywhere (route not used)
   - **Action**: DELETE (or move to `_examples/` if you want to keep as reference)

7. **`components/Text.jsx`** ⚠️ REVIEW
   - **Reason**: Appears to be a test component ("Hello Ariyan", test toast messages)
   - **Status**: ⚠️ Need to verify - check if used anywhere
   - **Action**: DELETE if unused (verify with grep first)

### Category 3: Documentation (Optional - Keep or Archive)

These markdown files are documentation. **Recommendation**: Keep them or move to `docs/` folder.

7. **`MOCKPAY_COMPLETE_TESTING_CHECKLIST.md`** - Keep or move to docs/
8. **`MOCKPAY_IMPLEMENTATION_SUMMARY.md`** - Keep or move to docs/
9. **`MOCKPAY_TESTING_CHECKLIST.md`** - Keep or move to docs/ (might be duplicate)
10. **`QUIZ_SYSTEM_IMPLEMENTATION_GUIDE.md`** - Keep or move to docs/
11. **`QUIZ_SYSTEM_STATUS.md`** - Keep or move to docs/
12. **`STRIPE_REMOVAL_CLEANUP_PLAN.md`** - Keep or move to docs/
13. **`WEBHOOK_FIX_VERIFICATION.md`** - Keep or move to docs/

---

## 📦 DEPENDENCIES TO REMOVE

### Stripe Packages (After Stripe Files Deletion)

1. **`stripe`** (v17.4.0)
   - **Reason**: No longer used (replaced by MockPay)
   - **Used by**: `lib/stripe.js` (which is being deleted)
   - **Action**: `npm uninstall stripe`

2. **`@stripe/stripe-js`** (v5.2.0)
   - **Reason**: Client-side Stripe SDK, no longer used
   - **Status**: ❌ Not imported anywhere (no client-side Stripe usage)
   - **Action**: `npm uninstall @stripe/stripe-js`

---

## ✅ FILES TO KEEP (Reviewed - In Use)

- All models in `model/` - All are used
- All queries in `queries/` - All are used
- All components in `components/` - All are used
- All lib utilities - All are used (except stripe files)
- All app routes - All are part of Next.js routing

---

## 📋 CLEANUP STEPS

### Step 1: Pre-Cleanup Verification

```bash
# 1. Ensure MockPay is working
# Test: Create a payment, verify it works

# 2. Run current build to establish baseline
npm run lint
npm run build
npm run dev  # Quick smoke test

# 3. Create a backup branch (recommended)
git checkout -b cleanup/unused-files
git add -A
git commit -m "Pre-cleanup checkpoint"
```

### Step 2: Delete Stripe Files

```bash
# Delete Stripe-related files
rm app/actions/stripe.js
rm lib/stripe.js
rm lib/stripe-helpers.js
rm -rf app/api/webhooks/stripe
```

### Step 3: Delete Example Files

```bash
# Delete example files
rm app/actions/account-updated-example.js
rm -rf app/api/upload-updated-example

# Delete test component (verify first!)
# grep -r "Text\|from.*Text\|import.*Text" app/ components/ --include="*.js" --include="*.jsx"
# If no results, then:
# rm components/Text.jsx
```

### Step 4: Remove Stripe Dependencies

```bash
# Remove Stripe packages
npm uninstall stripe @stripe/stripe-js
```

### Step 5: Verify Build

```bash
# Run linter
npm run lint

# Build project
npm run build

# If build succeeds, start dev server
npm run dev
```

### Step 6: Optional - Organize Documentation

```bash
# Create docs folder (optional)
mkdir -p docs

# Move documentation files (optional)
mv MOCKPAY_*.md docs/ 2>/dev/null || true
mv QUIZ_SYSTEM_*.md docs/ 2>/dev/null || true
mv STRIPE_REMOVAL_CLEANUP_PLAN.md docs/ 2>/dev/null || true
mv WEBHOOK_FIX_VERIFICATION.md docs/ 2>/dev/null || true
```

---

## 🔍 POST-CLEANUP VERIFICATION

### Checklist

- [ ] All Stripe files deleted
- [ ] All example files deleted
- [ ] Stripe dependencies removed from package.json
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] MockPay checkout flow works
- [ ] Course enrollment works
- [ ] Payment creation works
- [ ] No console errors related to deleted files

### Manual Testing

1. **MockPay Flow**:
   - Navigate to a paid course
   - Click "Enroll Now"
   - Complete MockPay checkout
   - Verify payment and enrollment created

2. **Course Access**:
   - Access enrolled courses
   - Verify lesson pages load

3. **Admin/Dashboard**:
   - Login as instructor
   - Verify dashboard loads
   - Check course management

---

## ⚠️ SAFETY NOTES

1. **Stripe Removal**: Only proceed if MockPay is fully tested and working
2. **Backup**: Create a git branch before cleanup
3. **Gradual**: Delete files one category at a time, test between steps
4. **Documentation**: Keep documentation files unless you're sure you don't need them
5. **Environment Variables**: Remove Stripe env vars from `.env` and `.env.example` after cleanup

---

## 📊 SUMMARY

**Files to Delete**: 6-7 files
- 4 Stripe-related files
- 2 Example files
- 1 Test component (Text.jsx - verify first)

**Dependencies to Remove**: 2 packages
- `stripe`
- `@stripe/stripe-js`

**Documentation**: 7 files (optional - keep or organize)

**Estimated Cleanup Time**: 15-30 minutes
**Risk Level**: 🟡 Medium (if MockPay is not fully tested)

---

## 🚀 QUICK CLEANUP COMMAND (After Verification)

```bash
# Create backup branch
git checkout -b cleanup/unused-files

# Delete files
rm app/actions/stripe.js \
   lib/stripe.js \
   lib/stripe-helpers.js \
   app/actions/account-updated-example.js \
   -rf app/api/webhooks/stripe \
   -rf app/api/upload-updated-example

# Remove dependencies
npm uninstall stripe @stripe/stripe-js

# Verify
npm run lint && npm run build
```

---

## ✅ FINAL VERIFICATION COMMANDS

```bash
# 1. Check for any remaining Stripe imports (should return nothing)
grep -r "from.*stripe\|import.*stripe\|require.*stripe" app/ lib/ components/ --include="*.js" --include="*.jsx" | grep -v node_modules

# 2. Verify no broken imports
npm run lint

# 3. Build project
npm run build

# 4. Check bundle size reduction (optional)
# Compare package-lock.json sizes before/after
```

---

## 📝 NOTES

- **Example Files**: Consider if you want to keep `account-updated-example.js` and `upload-updated-example` as reference. They demonstrate best practices but are not used.
- **Documentation**: The markdown files are valuable documentation. Consider organizing them in a `docs/` folder.
- **Environment Variables**: Don't forget to clean up `.env` and `.env.example` files (remove STRIPE_* variables).

---

**Status**: Ready for execution after MockPay verification ✅

