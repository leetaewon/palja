import { useEffect, useState } from 'react';
import type { FontSize, FontStyle, Theme } from '../lib/storage';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentTheme: Theme;
  currentFont: FontStyle;
  currentFontSize: FontSize;
  onApply: (settings: { theme: Theme; font: FontStyle; fontSize: FontSize }) => void;
}

export function SettingsModal({
  open,
  onClose,
  currentTheme,
  currentFont,
  currentFontSize,
  onApply,
}: SettingsModalProps) {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const [font, setFont] = useState<FontStyle>(currentFont);
  const [fontSize, setFontSize] = useState<FontSize>(currentFontSize);

  useEffect(() => {
    if (open) {
      setTheme(currentTheme);
      setFont(currentFont);
      setFontSize(currentFontSize);
    }
  }, [open, currentTheme, currentFont, currentFontSize]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleApply = () => {
    onApply({ theme, font, fontSize });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__head">
          <h2 id="settings-title" className="settings-modal__title">
            화면 및 읽기 설정
          </h2>
          <button type="button" className="btn btn--ghost settings-modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="settings-modal__body">
          {/* 1. 글꼴 설정 */}
          <section className="settings-group">
            <h3 className="settings-group__label">글꼴 (Font)</h3>
            <div className="settings-options">
              <button
                type="button"
                className={`settings-opt-btn ${font === 'serif' ? 'is-active' : ''}`}
                style={{ fontFamily: "'Gowun Batang', serif" }}
                onClick={() => setFont('serif')}
              >
                명조 (Serif)
              </button>
              <button
                type="button"
                className={`settings-opt-btn ${font === 'sans' ? 'is-active' : ''}`}
                style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                onClick={() => setFont('sans')}
              >
                고딕 (Sans-serif)
              </button>
            </div>
          </section>

          {/* 2. 글자 크기 설정 */}
          <section className="settings-group">
            <h3 className="settings-group__label">글자 크기 (Size)</h3>
            <div className="settings-options">
              <button
                type="button"
                className={`settings-opt-btn ${fontSize === 'sm' ? 'is-active' : ''}`}
                onClick={() => setFontSize('sm')}
              >
                작게 (15px)
              </button>
              <button
                type="button"
                className={`settings-opt-btn ${fontSize === 'md' ? 'is-active' : ''}`}
                onClick={() => setFontSize('md')}
              >
                보통 (17px)
              </button>
              <button
                type="button"
                className={`settings-opt-btn ${fontSize === 'lg' ? 'is-active' : ''}`}
                onClick={() => setFontSize('lg')}
              >
                크게 (20px)
              </button>
            </div>
          </section>

          {/* 3. 화면 테마 설정 */}
          <section className="settings-group">
            <h3 className="settings-group__label">화면 모드 (Theme)</h3>
            <div className="settings-options">
              <button
                type="button"
                className={`settings-opt-btn ${theme === 'light' ? 'is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                한지 (밝은 화면)
              </button>
              <button
                type="button"
                className={`settings-opt-btn ${theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                먹 (어두운 화면)
              </button>
            </div>
          </section>
        </div>

        <div className="settings-modal__foot">
          <button type="button" className="btn btn--primary btn--big" onClick={handleApply}>
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
