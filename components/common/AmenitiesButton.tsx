'use client';

import { useState } from 'react';
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
  shade: 'sun',
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

const AmenitiesButton = ({ selectedAmenities, onAmenitiesChange, className, style, locale }: AmenitiesButtonProps) => {
  const { t: tSkateparks } = useTranslation(locale, 'skateparks');
  const { t: tCommon } = useTranslation(locale, 'common');
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant={isActive ? "blue" : "gray"}
                size="sm"
                className={`relative active:scale-95 transition-all duration-200 ${className || ''}`}
                aria-label={tSkateparks('amenities.filterBy') || 'Filter by amenities'}
                aria-expanded={isOpen}
                aria-controls="amenities-popover"
                style={style}
              >
                <Icon 
                  name="filterBold" 
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
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent 
          side="bottom" 
          className="text-center"
          variant={isActive ? "red" : "gray"}
       >
            {!isActive ? tSkateparks('amenities.filterBy') || 'Filter by amenities' : tSkateparks('amenities.filterByDisable') || 'Disable amenities filtering'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-fit min-w-[330px] p-2">
        <div className="space-y-2">
          <div className={`flex gap-4 ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'} items-center justify-between h-[32px]`}>
            <h4 className={`text-sm font-medium w-full ${selectedAmenities.length > 0 ? (locale === 'he' ? 'text-right' : 'text-left') : 'text-center'}`}>{tSkateparks('amenities.filterBy') || 'Filter by amenities'}</h4>
            {selectedAmenities.length > 0 && (
              <Button
                variant="red"
                size="sm"
                onClick={clearAll}
                className=" h-8 px-2 text-xs flex flex-row-reverse gap-1 items-center"
              >
                {tCommon('clear') || 'Clear'}
                <Icon 
                  name="trash" 
                  className="h-3 w-3"
                />
              </Button>
            )}
          </div>
          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
          <table className="w-full">
            <tbody>
              {Array.from({ length: Math.ceil(amenityOptions.length / 2) }).map((_, rowIndex) => {
                const leftAmenity = amenityOptions[rowIndex * 2];
                const rightAmenity = amenityOptions[rowIndex * 2 + 1];
                return (
                  <tr key={rowIndex}>
                    <td className="p-1 border-r border-popover-border dark:border-popover-border-dark">
                      {leftAmenity && (() => {
                        const iconName = AMENITY_ICON_MAP[leftAmenity.key] || 'filter';
                        const isSelected = selectedAmenities.includes(leftAmenity.key);
                        return (
                          <Button
                            variant={isSelected ? "info" : "none"}
                            size="sm"
                            className={`font-medium w-full justify-start text-nowrap ${isSelected ? '' : 'text-text dark:text-text-dark/90'}`}
                            onClick={() => toggleAmenity(leftAmenity.key)}
                          >
                            <Icon 
                              name={iconName as any}
                              className={`w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0 transition-all duration-200 ${isSelected ? 'text-info dark:text-info-dark' : 'text-text-secondary dark:text-text-secondary-dark'}`}
                            />
                            {tSkateparks(leftAmenity.label)}
                          </Button>
                        );
                      })()}
                    </td>
                    <td className="p-1">
                      {rightAmenity && (() => {
                        const iconName = AMENITY_ICON_MAP[rightAmenity.key] || 'filter';
                        const isSelected = selectedAmenities.includes(rightAmenity.key);
                        return (
                          <Button
                            variant={isSelected ? "info" : "none"}
                            size="sm"
                            className={`w-full justify-start text-nowrap ${isSelected ? '' : 'text-text dark:text-text-dark/90'}`}
                            onClick={() => toggleAmenity(rightAmenity.key)}
                          >
                            <Icon 
                              name={iconName as any}
                              className={`w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0 transition-all duration-200 ${isSelected ? 'text-info dark:text-info-dark' : 'text-text-secondary dark:text-text-secondary-dark'}`}
                            />
                            {tSkateparks(rightAmenity.label)}
                          </Button>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AmenitiesButton;

