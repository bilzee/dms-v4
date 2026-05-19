# 9. Performance Optimization

## 9.1 Code Splitting Strategy

```typescript
// Dynamic imports for role-specific bundles
const AssessorDashboard = dynamic(
  () => import('@/components/dashboards/AssessorDashboard'),
  { ssr: false }
);

const CoordinatorDashboard = dynamic(
  () => import('@/components/dashboards/CoordinatorDashboard'),
  { ssr: false }
);
```

## 9.2 Image Optimization

```tsx
// Use Next.js Image component with offline fallback
import Image from 'next/image';

function EntityImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      loading="lazy"
      placeholder="blur"
      blurDataURL={generateBlurDataURL()}
      onError={(e) => {
        e.currentTarget.src = '/offline-placeholder.png';
      }}
    />
  );
}
```
