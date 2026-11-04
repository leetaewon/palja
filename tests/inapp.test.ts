import { describe, expect, it, beforeEach } from 'vitest';
import { detectInAppBrowser, dismissInAppBanner, isInAppBannerDismissed } from '../src/ui/lib/inapp';

describe('인앱 브라우저 감지 및 유틸리티', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('일반 사파리/크롬 브라우저는 인앱으로 감지되지 않는다', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const info = detectInAppBrowser(ua);
    expect(info.isInApp).toBe(false);
    expect(info.isIosInApp).toBe(false);
    expect(info.appName).toBeNull();
  });

  it('카카오톡 인앱 브라우저를 정확히 감지한다', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.0';
    const info = detectInAppBrowser(ua);
    expect(info.isInApp).toBe(true);
    expect(info.isIosInApp).toBe(true);
    expect(info.appName).toBe('카카오톡');
  });

  it('인스타그램 인앱 브라우저를 정확히 감지한다', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0';
    const info = detectInAppBrowser(ua);
    expect(info.isInApp).toBe(true);
    expect(info.isIosInApp).toBe(true);
    expect(info.appName).toBe('인스타그램');
  });

  it('페이스북 인앱 브라우저를 정확히 감지한다', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FBAN/EMA;FBAV/380.0.0;]';
    const info = detectInAppBrowser(ua);
    expect(info.isInApp).toBe(true);
    expect(info.isIosInApp).toBe(false);
    expect(info.appName).toBe('페이스북');
  });

  it('배너 닫기 상태가 sessionStorage에 정상 저장된다', () => {
    expect(isInAppBannerDismissed()).toBe(false);
    dismissInAppBanner();
    expect(isInAppBannerDismissed()).toBe(true);
  });
});
