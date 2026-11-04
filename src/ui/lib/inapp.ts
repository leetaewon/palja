// 인앱 브라우저 감지 및 처리 유틸리티

export interface InAppBrowserInfo {
  isInApp: boolean;
  isIosInApp: boolean;
  appName: string | null;
}

export function detectInAppBrowser(customUA?: string): InAppBrowserInfo {
  let ua = customUA ?? '';
  if (!ua) {
    const g = globalThis as unknown as {
      navigator?: { userAgent?: string; vendor?: string };
      opera?: string;
    };
    if (typeof g.navigator !== 'undefined') {
      ua = g.navigator.userAgent || g.navigator.vendor || g.opera || '';
    }
  }

  if (!ua) {
    return { isInApp: false, isIosInApp: false, appName: null };
  }

  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let appName: string | null = null;
  let isInApp = false;

  if (/KAKAOTALK/i.test(ua)) {
    isInApp = true;
    appName = '카카오톡';
  } else if (/Instagram/i.test(ua)) {
    isInApp = true;
    appName = '인스타그램';
  } else if (/FBAN|FBAV/i.test(ua)) {
    isInApp = true;
    appName = '페이스북';
  } else if (/Line\//i.test(ua)) {
    isInApp = true;
    appName = '라인';
  } else if (/NAVER\(inapp/i.test(ua)) {
    isInApp = true;
    appName = '네이버';
  } else if (/inapp|webview/i.test(ua)) {
    isInApp = true;
    appName = '인앱 브라우저';
  }

  const isIosInApp = isIOS && isInApp;

  return {
    isInApp,
    isIosInApp,
    appName,
  };
}

const DISMISS_KEY = 'palja:inapp_dismissed';

export function isInAppBannerDismissed(): boolean {
  try {
    const g = globalThis as unknown as {
      sessionStorage?: { getItem(k: string): string | null };
    };
    return g.sessionStorage?.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInAppBanner(): void {
  try {
    const g = globalThis as unknown as {
      sessionStorage?: { setItem(k: string, v: string): void };
    };
    g.sessionStorage?.setItem(DISMISS_KEY, '1');
  } catch {
    // sessionStorage 접근 불가 무시
  }
}
