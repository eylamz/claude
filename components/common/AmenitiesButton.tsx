'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/client';
import { Icon } from '@/components/icons';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Drawer } from "@/components/ui/drawer";

const amenityOptions = [
  { key: 'parking', label: 'amenities.parking' },
  { key: 'entryFee', label: 'amenities.entryFee' },
  { key: 'bathroom', label: 'amenities.bathroom' },
  { key: 'shade', label: 'amenities.shade' },
  { key: 'seating', label: 'amenities.seating' },
  { key: 'noWax', label: 'amenities.noWax' },
  { key: 'nearbyRestaurants', label: 'amenities.nearbyRestaurants' },
  { key: 'guard', label: 'amenities.guard' },
  { key: 'helmetRequired', label: 'amenities.helmetRequired' },
  { key: 'scootersAllowed', label: 'amenities.scootersAllowed' },
  { key: 'bikesAllowed', label: 'amenities.bikesAllowed' },
  { key: 'bombShelter', label: 'amenities.bombShelter' },
];

// Map amenity keys to icon names
const AMENITY_ICON_MAP: Record<string, string> = {
  parking: 'parking',
  shade: 'umbrellaBold',
  bathroom: 'toilet',
  guard: 'securityGuard',
  seating: 'couch',
  nearbyRestaurants: 'nearbyResturants',
  scootersAllowed: 'scooter',
  bikesAllowed: 'bmx-icon',
  entryFee: 'shekel',
  helmetRequired: 'helmet',
  bombShelter: 'safe-house',
  noWax: 'Wax',
};

interface AmenitiesButtonProps {
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
  locale: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

const AmenitiesButton = ({ selectedAmenities, onAmenitiesChange, className, style, locale }: AmenitiesButtonProps) => {
  const { t: tSkateparks } = useTranslation(locale, 'skateparks');
  const { t: tCommon } = useTranslation(locale, 'common');
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const isActive = selectedAmenities.length > 0;

  const toggleAmenity = (amenityKey: string) => {
    if (selectedAmenities.includes(amenityKey)) {
      onAmenitiesChange(selectedAmenities.filter(key => key !== amenityKey));
    } else {
      onAmenitiesChange([...selectedAmenities, amenityKey]);
    }
  };

  const clearAll = () => {
    onAmenitiesChange([]);
    setIsOpen(false);
  };

  const buttonElement = (
    <Button
      variant={isActive ? "blue" : "gray"}
      size="sm"
      className={`relative active:scale-95 transition-all duration-200 ${className || ''}`}
      aria-label={tSkateparks('amenities.filterBy') || 'Filter by amenities'}
      aria-expanded={isOpen}
      aria-controls={isMobile ? 'amenities-drawer' : 'amenities-popover'}
      style={style}
      onClick={isMobile ? () => setIsOpen(true) : undefined}
    >
      <Icon 
        name={isActive ? "filterBold" : "filter"} 
        className="w-5 h-5"
      />
      {isActive && (
        <Badge 
          variant="blue" 
          className="rounded-full text-info dark:text-info-dark poppins absolute -top-2 -right-2 min-w-[18px] min-h-[18px] p-0 flex items-center justify-center text-[10px]"
        >
          {selectedAmenities.length}
        </Badge>
      )}
    </Button>
  );

  const amenitiesContent = (
    <div className="space-y-2">
      {!isMobile && (
        <>
          <div className={`flex gap-4 ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'} items-center justify-between h-[32px]`}>
            <h4 className={`text-sm font-medium`}>{tSkateparks('amenities.filterBy') || 'Filter by amenities'}</h4>
            <div className={`flex gap-1.5 items-center ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}>
              {selectedAmenities.length > 0 && (
                <Button
                  variant="red"
                  size="sm"
                  onClick={clearAll}
                  className="opacity-0 animate-popFadeIn h-8 px-2 text-xs flex flex-row-reverse gap-1 items-center"
                  style={{ animationDelay: `300ms` }}
                >
                  {tCommon('clear') || 'Clear'}
                  <Icon 
                    name="trash" 
                    className="h-3 w-3"
                  />
                </Button>
              )}
              <Button
                variant="gray"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 shrink-0"
                aria-label={tCommon('close') || 'Close'}
              >
                <Icon name="X" className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
        </>
      )}
      {isMobile && selectedAmenities.length > 0 && (
        <>
          <div className={`flex ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'} justify-end`}>
            <Button
              variant="red"
              size="sm"
              onClick={clearAll}
              className="h-8 px-2 text-xs flex flex-row-reverse gap-1 items-center"
            >
              {tCommon('clear') || 'Clear'}
              <Icon 
                name="trash" 
                className="h-3 w-3"
              />
            </Button>
          </div>
          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
        </>
      )}
      {isMobile ? (
        <div className={`flex flex-col gap-1 ${locale === 'he' ? 'items-end' : 'items-start'}`}>
          {amenityOptions.map((amenity) => (
            <Button
              key={amenity.key}
              variant={selectedAmenities.includes(amenity.key) ? "blue" : "none"}
              size="sm"
              className={`flex gap-2 font-medium w-full justify-start min-w-0 ${
                selectedAmenities.includes(amenity.key) ? '' : 'text-gray dark:text-gray-dark'
              } ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
              onClick={() => toggleAmenity(amenity.key)}
            >
              <Icon 
                name={AMENITY_ICON_MAP[amenity.key] as any || 'filter'}
                className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                  selectedAmenities.includes(amenity.key) ? 'text-blue dark:text-blue-dark' : 'text-gray/75 dark:text-gray-dark/75'
                }`}
              />
              {tSkateparks(amenity.label)}
            </Button>
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse">
          <tbody>
            {Array.from({ length: Math.ceil(amenityOptions.length / 2) }).map((_, rowIndex) => {
              const leftAmenity = amenityOptions[rowIndex * 2];
              const rightAmenity = amenityOptions[rowIndex * 2 + 1];
              return (
                <tr key={rowIndex}>
                  <td 
                    className="w-1/2 px-1 py-0.5 border-r border-popover-border dark:border-popover-border-dark"
                    style={{ textAlign: locale === 'he' ? 'right' : 'left' }}
                  >
                    <div className={`inline-flex ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {leftAmenity && (
                        <Button
                          variant={selectedAmenities.includes(leftAmenity.key) ? "blue" : "none"}
                          size="sm"
                          className={`flex gap-2 font-medium w-fit text-nowrap ${
                            selectedAmenities.includes(leftAmenity.key) ? '' : 'text-gray dark:text-gray-dark'
                          } ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                          onClick={() => toggleAmenity(leftAmenity.key)}
                        >
                          <Icon 
                            name={AMENITY_ICON_MAP[leftAmenity.key] as any || 'filter'}
                            className={`w-4 h-4 transition-all duration-200 ${
                              selectedAmenities.includes(leftAmenity.key) ? 'text-blue dark:text-blue-dark' : 'text-gray/75 dark:text-gray-dark/75'
                            }`}
                          />
                          {tSkateparks(leftAmenity.label)}
                        </Button>
                      )}
                    </div>
                  </td>
                  <td 
                    className="w-1/2 px-1 py-0.5"
                    style={{ textAlign: locale === 'he' ? 'right' : 'left' }}
                  >
                    <div className={`inline-flex ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {rightAmenity && (
                        <Button
                          variant={selectedAmenities.includes(rightAmenity.key) ? "blue" : "none"}
                          size="sm"
                          className={`flex gap-2 w-fit text-nowrap ${
                            selectedAmenities.includes(rightAmenity.key) ? '' : 'text-text dark:text-text-dark/90'
                          } ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                          onClick={() => toggleAmenity(rightAmenity.key)}
                        >
                          <Icon 
                            name={AMENITY_ICON_MAP[rightAmenity.key] as any || 'filter'}
                            className={`w-4 h-4 transition-all duration-200 ${
                              selectedAmenities.includes(rightAmenity.key) ? 'text-blue dark:text-blue-dark' : 'text-gray/75 dark:text-gray-dark/75'
                            }`}
                          />
                          {tSkateparks(rightAmenity.label)}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonElement}
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              className="text-center"
              variant={isActive ? "blue" : "gray"}
            >
              {!isActive ? tSkateparks('amenities.filterBy') || 'Filter by amenities' : tSkateparks('amenities.filterByDisable') || 'Disable amenities filtering'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Drawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={tSkateparks('amenities.filterBy') || 'Filter by amenities'}
        >
          {amenitiesContent}
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {!isOpen ? (
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                {buttonElement}
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              className="text-center"
              variant={isActive ? "blue" : "gray"}
            >
              {!isActive ? tSkateparks('amenities.filterBy') || 'Filter by amenities' : tSkateparks('amenities.filterByDisable') || 'Disable amenities filtering'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <PopoverTrigger asChild>
          {buttonElement}
        </PopoverTrigger>
      )}
      <PopoverContent className="w-fit p-2">
        {amenitiesContent}
      </PopoverContent>
    </Popover>
  );
};

export default AmenitiesButton;

