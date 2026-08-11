"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { regionsApi, type Province } from "@/lib/api";

interface ProvinceDistrictSelectProps {
  districtId: string;
  onDistrictIdChange: (districtId: string) => void;
}

/** Kademeli il → ilçe seçimi. Önceden serbest metin bir "Bölge" alanıydı ("istanbul"/"İstanbul" gibi
 * farklı yazımlar RegionAdmin'in bölge kuyruğunu sessizce boş gösteriyordu) — artık kapalı bir referans
 * kümesinden (bkz. regionsApi, Identity/Entities/District.cs) seçiliyor. */
export function ProvinceDistrictSelect({ districtId, onDistrictIdChange }: ProvinceDistrictSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceId, setProvinceId] = useState("");

  useEffect(() => {
    void regionsApi.list().then(setProvinces).catch(() => {});
  }, []);

  useEffect(() => {
    // districtId dışarıdan (örn. daha önce seçilmiş bir değerle) geldiyse, il seçimini geriye doğru türet.
    if (districtId && !provinceId) {
      const match = provinces.find((p) => p.districts.some((d) => d.id === districtId));
      if (match) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- districtId prop'undan provinceId'yi türetme
        setProvinceId(match.id);
      }
    }
  }, [districtId, provinceId, provinces]);

  const districts = provinces.find((p) => p.id === provinceId)?.districts ?? [];

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={provinceId}
        onValueChange={(v) => {
          setProvinceId(v);
          onDistrictIdChange("");
        }}
      >
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

      <Select value={districtId} onValueChange={onDistrictIdChange} disabled={!provinceId}>
        <SelectTrigger>
          <SelectValue placeholder="İlçe" />
        </SelectTrigger>
        <SelectContent>
          {districts.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
