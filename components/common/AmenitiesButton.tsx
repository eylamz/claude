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
                variant={isActive ? "primary" : "outline"}
                size="xl"
                className={`relative active:scale-95 transition-all duration-200 ${className || ''}`}
                aria-label={tSkateparks('amenities.filterBy') || 'Filter by amenities'}
                aria-expanded={isOpen}
                aria-controls="amenities-popover"
                style={style}
              >
                <Icon 
                  name="filter" 
                  className="w-5 h-5"
                />
                {isActive && (
                  <Badge 
                    variant="ghost" 
                    className="text-brand-main dark:text-brand-dark poppins absolute -top-2 -right-2 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-[10px]"
                  >
                    {selectedAmenities.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-center">
            {tSkateparks('amenities.filterBy') || 'Filter by amenities'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-fit min-w-[330px] p-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between h-[32px]">
            <h4 className="font-medium">{tSkateparks('amenities.filterBy') || 'Filter by amenities'}</h4>
            {selectedAmenities.length > 0 && (
              <Button
                variant="error"
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
            )}
          </div>
          <Separator className="bg-text-secondary dark:bg-white/20" />
          <div className="grid grid-cols-2 gap-2">
            {amenityOptions.map((amenity) => {
              const iconName = AMENITY_ICON_MAP[amenity.key] || 'filter';
              const isSelected = selectedAmenities.includes(amenity.key);
              return (
                <Button
                  key={amenity.key}
                  variant={isSelected ? "info" : "ghost2"}
                  size="sm"
                  className={`min-w-[100px] justify-start text-nowrap ${isSelected ? '' : 'text-text dark:text-text-dark/90'}`}
                  onClick={() => toggleAmenity(amenity.key)}
                >
                  <Icon 
                    name={iconName as any}
                    className={`w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0 transition-all duration-200 ${isSelected ? 'text-info dark:text-info-dark' : 'text-text-secondary dark:text-text-secondary-dark'}`}
                  />
                  {tSkateparks(amenity.label)}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AmenitiesButton;

