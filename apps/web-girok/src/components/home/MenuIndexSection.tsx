import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { MenuCard, MenuRow, ViewToggle, type ViewMode } from '@my-girok/ui-components';
import { MENU_ITEMS, WIDGET_ENABLED_IDS, type MenuItem } from './constants';

interface MenuIndexSectionProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  pinnedWidgetId: string | null;
  onPinWidget: (menuId: string) => void;
}

/**
 * MenuIndexSection - Main menu grid/list with view toggle
 * V0.0.1 Index Style
 */
function MenuIndexSectionComponent({
  viewMode,
  onViewModeChange,
  pinnedWidgetId,
  onPinWidget,
}: MenuIndexSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Curried handler for menu click
  const handleMenuClick = useCallback(
    (menu: MenuItem) => () => {
      if (menu.status === 'active') {
        navigate(menu.route);
      }
    },
    [navigate],
  );

  // Curried handler for pin widget
  const handlePinWidget = useCallback(
    (menuId: string) => () => {
      onPinWidget(menuId);
    },
    [onPinWidget],
  );

  // Check if a menu can be pinned as widget
  const canPinAsWidget = useCallback(
    (menuId: string) => WIDGET_ENABLED_IDS.includes(menuId as (typeof WIDGET_ENABLED_IDS)[number]),
    [],
  );

  return (
    <section className="mb-24" aria-label={t('aria.mainMenu')}>
      {/* Section Header with View Toggle - V0.0.1 Style */}
      <div className="flex items-center justify-between mb-14 border-b-4 border-theme-text-primary pb-10 px-6">
        <h2 className="text-4xl text-theme-text-primary tracking-tight font-serif-title">
          {t('home.index', { defaultValue: 'Index' })}
        </h2>
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
          {MENU_ITEMS.map((menu, index) => {
            const IconComponent = menu.icon;
            const isDisabled = menu.status === 'coming-soon';
            const canPin = canPinAsWidget(menu.id);

            return (
              <MenuCard
                key={menu.id}
                index={index + 1}
                icon={<IconComponent />}
                title={t(menu.nameKey)}
                description={isDisabled ? t('home.comingSoon') : t(menu.descriptionKey)}
                onClick={isDisabled ? undefined : handleMenuClick(menu)}
                isPinned={pinnedWidgetId === menu.id}
                onPin={canPin ? handlePinWidget(menu.id) : undefined}
                pinTooltip={
                  pinnedWidgetId === menu.id ? t('widget.unpinFromTop') : t('widget.pinToTop')
                }
                className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                aria-label={
                  isDisabled ? `${t(menu.nameKey)} - ${t('home.comingSoon')}` : t(menu.nameKey)
                }
              />
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {MENU_ITEMS.map((menu, index) => {
            const IconComponent = menu.icon;
            const isDisabled = menu.status === 'coming-soon';
            const canPin = canPinAsWidget(menu.id);

            return (
              <MenuRow
                key={menu.id}
                index={index + 1}
                icon={<IconComponent />}
                title={
                  isDisabled ? `${t(menu.nameKey)} (${t('home.comingSoon')})` : t(menu.nameKey)
                }
                description={isDisabled ? undefined : t(menu.descriptionKey)}
                onClick={isDisabled ? undefined : handleMenuClick(menu)}
                isPinned={pinnedWidgetId === menu.id}
                onPin={canPin ? handlePinWidget(menu.id) : undefined}
                className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                aria-label={
                  isDisabled ? `${t(menu.nameKey)} - ${t('home.comingSoon')}` : t(menu.nameKey)
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export const MenuIndexSection = memo(MenuIndexSectionComponent);
