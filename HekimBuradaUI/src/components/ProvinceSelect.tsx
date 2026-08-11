"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { regionsApi, type Province } from "@/lib/api";

interface ProvinceSelectProps {
  provinceId: string;
  onProvinceIdChange: (provinceId: string) => void;
}

/** Sadece il seçimi (ilçesiz) — RegionAdmin bölge ataması il bazlı (bkz. DoctorVerificationController.
 * AssignRegionAdmin); doktorun kendi adresi için kademeli il/ilçe seçimine bkz. ProvinceDistrictSelect. */
export function ProvinceSelect({ provinceId, onProvinceIdChange }: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    void regionsApi.list().then(setProvinces).catch(() => {});
  }, []);

  return (
    <Select value={provinceId} onValueChange={onProvinceIdChange}>
      <SelectTrigger>
        <SelectValue placeholder="İl" />
      </SelectTrigger>
      <SelectContent>
        {provinces.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
