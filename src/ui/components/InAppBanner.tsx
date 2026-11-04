import { useState } from 'react';
import { detectInAppBrowser, dismissInAppBanner, isInAppBannerDismissed } from '../lib/inapp';

export function InAppBanner() {
  const [dismissed, setDismissed] = useState(isInAppBannerDismissed);
  const info = detectInAppBrowser();

  // 자동 탈출이 지원되지 않는 iOS 인앱 브라우저이거나, dataset 플래그가 설정된 경우에만 노출
  const shouldShow =
    !dismissed &&
    (info.isIosInApp ||
      (typeof document !== 'undefined' && document.documentElement.dataset.inAppIos === 'true'));

  if (!shouldShow) return null;

  const handleDismiss = () => {
    dismissInAppBanner();
    setDismissed(true);
  };

  const appLabel = info.appName ?? '앱';

  return (
    <aside className="inapp-banner" role="status" aria-label="외부 브라우저 열기 안내">
      <div className="inapp-banner__inner">
        <span className="inapp-banner__badge">{appLabel} 안내</span>
        <p className="inapp-banner__text">
          게임 기록(팔자·도감)을 영구 보존하려면 상단 또는 하단 <strong>•••</strong>을 눌러{' '}
          <strong>[Safari로 열기]</strong>를 권장합니다.
        </p>
        <button
          type="button"
          className="inapp-banner__close"
          onClick={handleDismiss}
          aria-label="안내 닫기"
          title="닫기"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
