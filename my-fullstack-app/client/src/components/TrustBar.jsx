import React from 'react';
import { Banknote, Clock } from 'lucide-react';

// Small trust bar shown below the review section (Cash on Delivery + 24 Hours Service)
export default function TrustBar() {
  const badges = [
    { icon: Banknote, label: 'Cash On Delivery' },
    { icon: Clock, label: '24 Hours Service' },
  ];

  return (
    <div className="w-full  border-t">
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 sm:divide-x sm:divide-gray-800">
          {badges.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="group flex items-center gap-3 px-6 sm:px-10 first:pl-0 last:pr-0"
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                className="text-white/50 group-hover:text-white transition-colors duration-300"
              />
              <span className="font-konexy text-[11px] sm:text-xs tracking-[2px] uppercase text-white/50 group-hover:text-white transition-colors duration-300">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
