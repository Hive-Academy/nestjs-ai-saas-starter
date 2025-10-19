# ScrollTrigger Debug & Testing Guide

## 🎯 Purpose

This guide helps you diagnose and validate GSAP ScrollTrigger animations in the landing page.

---

## ✅ What We've Added for Debugging

### 1. **Console Logging** (scroll-animation.directive.ts)

Every ScrollAnimation directive now logs detailed debug information:

```
[ScrollAnimation] Initializing on element: {tagName, className, offsetTop, ...}
[ScrollAnimation] Animation config: {from, to, start, end, scrub}
[ScrollAnimation] ScrollTrigger created: {id, start, end, scroller}
[ScrollAnimation] ScrollTrigger ENTER
[ScrollAnimation] ScrollTrigger UPDATE - Progress: 0.5
[ScrollAnimation] Timeline progress: 0.5
```

### 2. **Visual Debug Markers**

Enabled on the hero title (`markers: true`). You'll see:

- **Green marker** - Start trigger point
- **Red marker** - End trigger point
- **White label** - Shows scroll progress

### 3. **Test Element** (landing-page.component.ts:184-198)

A bright yellow test section right after the hero:

```
🎯 SCROLL TEST - If this moves, ScrollTrigger works!
```

This uses a simple `slideUp` animation with markers enabled.

---

## 🔍 Testing Procedure

### Step 1: Start the Development Server

```bash
npm run dev:services  # Start backend services if needed
npx nx serve dev-brand-ui
```

### Step 2: Open Browser DevTools

1. Open Chrome/Edge DevTools (F12)
2. Go to **Console** tab
3. Clear the console

### Step 3: Load the Page

Navigate to `http://localhost:4200`

**Expected Console Output:**

```
[ScrollAnimation] Initializing on element: {...}
[ScrollAnimation] Animation config: {...}
[ScrollAnimation] ScrollTrigger created: {...}
[ScrollAnimation] Refreshing ScrollTrigger...
[ScrollAnimation] Total ScrollTriggers: 5  ← Should be > 0
```

### Step 4: Check for Errors

**Look for:**

- ❌ `ScrollTrigger is not defined` → Plugin not loaded
- ❌ `Cannot read properties of null` → Element not found
- ✅ No errors → ScrollTrigger initialized successfully

### Step 5: Test Scroll Behavior

**Test the Yellow Test Element First:**

1. Scroll down slowly past the hero section
2. Watch for the yellow "SCROLL TEST" text
3. You should see:
   - **Visual markers** (green/red lines on the page)
   - **Console logs** showing scroll progress
   - **Animation** - text sliding up from bottom

**Console Output While Scrolling:**

```
[ScrollAnimation] ScrollTrigger UPDATE - Progress: 0.1
[ScrollAnimation] Timeline progress: 0.1
[ScrollAnimation] ScrollTrigger UPDATE - Progress: 0.5
[ScrollAnimation] Timeline progress: 0.5
[ScrollAnimation] ScrollTrigger LEAVE
```

### Step 6: Test Hero Section Animations

1. Scroll back to top
2. Slowly scroll down through the hero section
3. Watch the hero title, description, badges, and buttons

**Expected Behavior:**

- Elements should **slide up** and **fade out** as you scroll
- Movement should be smooth and linked to scroll position
- Console should log `UPDATE` events continuously

---

## 🐛 Troubleshooting

### Issue 1: "No console logs appear"

**Cause:** ScrollAnimation directive not initializing

**Solutions:**

1. Check that `ScrollAnimationDirective` is imported in component
2. Verify `scrollAnimation` directive is applied to elements
3. Check browser console for import errors

### Issue 2: "ScrollTrigger created but no animation"

**Cause:** Timeline not linked properly or scroll position issue

**Check:**

```javascript
// In console:
ScrollTrigger.getAll(); // Should return array of ScrollTriggers
```

**Expected:**

```javascript
[
  ScrollTrigger{...},  // Test element
  ScrollTrigger{...},  // Hero title
  ScrollTrigger{...},  // Hero description
  ScrollTrigger{...},  // Hero badges
  ScrollTrigger{...},  // Hero buttons
]
```

### Issue 3: "Animations play once on load, not on scroll"

**Cause:** GSAP timeline auto-playing before ScrollTrigger attaches

**Verify Fix:**

- Check timeline is created with `{ paused: true }`
- Console should show `Timeline started` ONLY when scrolling, not on page load

### Issue 4: "Markers visible but animation doesn't work"

**Cause:** ScrollTrigger detecting position but not animating

**Debug:**

```javascript
// In console:
const st = ScrollTrigger.getAll()[0]; // Get first ScrollTrigger
console.log('Progress:', st.progress); // Should change when scrolling
console.log('Animation:', st.animation); // Should exist
st.animation.progress(); // Check animation progress
```

### Issue 5: "Hero elements don't move at all"

**Possible Causes:**

1. **`overflow-hidden` conflict**

   - Hero section has `overflow-hidden` which might clip animated elements
   - Try temporarily removing it from hero-section.component.ts:13

2. **`position: absolute` interference**

   - Content overlay is `absolute inset-0` (line 21)
   - ScrollTrigger might not detect position properly

3. **`transform-gpu` or `perspective` creating new stacking context**
   - Line 14 has `perspective: 1000px`
   - Line 24 has `transform-gpu` class
   - These can interfere with scroll calculations

**Test Fix:**

```html
<!-- Temporarily change hero section container: -->
<div class="relative w-full h-screen bg-gradient-to-br from-black via-sky-900 to-black">
  <!-- Remove: overflow-hidden, perspective -->
</div>
```

---

## 📊 Expected Results

### ✅ Working Correctly

**Console Output:**

- 5 ScrollTriggers created
- No errors
- Continuous UPDATE events while scrolling
- Progress values 0 → 1 → 0 (when scrolling down/up)

**Visual Behavior:**

- Yellow test text slides up when scrolling past it
- Hero elements slide up + fade out when scrolling down
- Smooth, scrubbed animation (linked to scroll)
- Markers visible (can be removed later)

### ❌ Not Working

**Console Output:**

- "ScrollTrigger is not defined"
- "Cannot read properties of null"
- No UPDATE events while scrolling
- Timeline starts on page load

**Visual Behavior:**

- Elements stay static
- No parallax effect
- Animations play once on load, ignore scroll

---

## 🔧 Manual Testing Commands

### Check ScrollTrigger Status

```javascript
// Open browser console:

// 1. Verify ScrollTrigger is loaded
console.log(ScrollTrigger); // Should be a function

// 2. Get all instances
ScrollTrigger.getAll(); // Should return array

// 3. Check specific trigger
const st = ScrollTrigger.getAll()[0];
console.log({
  start: st.start,
  end: st.end,
  progress: st.progress,
  isActive: st.isActive,
});

// 4. Force refresh (if positions are wrong)
ScrollTrigger.refresh();

// 5. Kill all (to reset)
ScrollTrigger.getAll().forEach((st) => st.kill());
```

### Check GSAP Timeline

```javascript
// Get timeline from first ScrollTrigger
const st = ScrollTrigger.getAll()[0];
const tl = st.animation;

console.log({
  paused: tl.paused(),
  progress: tl.progress(),
  duration: tl.duration(),
});

// Manually test animation
tl.progress(0.5); // Should animate to 50%
```

---

## 🎨 Interpreting Debug Markers

When `markers: true` is enabled, you'll see:

**Green Line + Label:**

- Position: Where `start: 'top top'` triggers
- Meaning: "Start animation when element's top hits viewport's top"

**Red Line + Label:**

- Position: Where `end: 'bottom top'` triggers
- Meaning: "End animation when element's bottom hits viewport's top"

**Progress Indicator:**

- Shows current progress (0.0 to 1.0)
- Updates in real-time as you scroll

---

## 📝 Next Steps Based on Results

### If Test Element Works BUT Hero Doesn't:

**Problem:** Hero section CSS interfering with ScrollTrigger

**Solution:**

1. Remove `overflow-hidden` from hero container
2. Change content overlay from `absolute` to `relative`
3. Test if animations start working

### If Nothing Works:

**Problem:** ScrollTrigger plugin not loaded or initialized

**Solution:**

1. Check `gsap.registerPlugin(ScrollTrigger)` is called
2. Verify GSAP version supports ScrollTrigger
3. Check for console errors during directive init

### If Everything Works:

**Success!** Remove debug elements:

1. Remove test section from landing-page.component.ts (lines 183-198)
2. Remove `markers: true` from hero-section.component.ts (line 36)
3. Optionally reduce console logging in scroll-animation.directive.ts

---

## 🚀 Performance Notes

**Console Logging Impact:**

- Current setup logs on EVERY scroll frame
- This is ONLY for debugging
- Remove logs before production

**Debug Markers Impact:**

- Markers add minimal overhead
- Safe to use during development
- Remove before production for cleaner UI

---

## 📞 Support

If animations still don't work after following this guide:

1. Share console output (copy all `[ScrollAnimation]` logs)
2. Share screenshot of debug markers
3. Share results of `ScrollTrigger.getAll()` command

This will help identify the exact issue!
