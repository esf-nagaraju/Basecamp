import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface SearchFilterBarProps {
  onFilterChange?: (filters: any) => void;
}

export function SearchFilterBar({ onFilterChange }: SearchFilterBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>();
  const [ageFilter, setAgeFilter] = useState<string>();

  const applyFilters = (search?: string, status?: string, age?: string) => {
    const filters: any = {};
    if (search && search.trim()) filters.search = search.trim();
    if (status) filters.status = [status];
    if (age) {
      const [min, max] = age.split("-");
      if (max === "") {
        filters.minAge = parseInt(min);
      } else {
        filters.minAge = parseInt(min);
        filters.maxAge = parseInt(max);
      }
    }
    onFilterChange?.(filters);
  };

  const removeFilter = (type: "status" | "age") => {
    if (type === "status") {
      setStatusFilter(undefined);
      applyFilters(searchTerm, undefined, ageFilter);
    } else {
      setAgeFilter(undefined);
      applyFilters(searchTerm, statusFilter, undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims, patients, or invoice numbers..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);
              applyFilters(value, statusFilter, ageFilter);
            }}
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            applyFilters(searchTerm, value, ageFilter);
          }}>
            <SelectTrigger className="w-[180px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_work">In Work</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ageFilter} onValueChange={(value) => {
            setAgeFilter(value);
            applyFilters(searchTerm, statusFilter, value);
          }}>
            <SelectTrigger className="w-[180px]" data-testid="select-age">
              <SelectValue placeholder="Age Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-30">0-30 days</SelectItem>
              <SelectItem value="31-60">31-60 days</SelectItem>
              <SelectItem value="61-90">61-90 days</SelectItem>
              <SelectItem value="90-">90+ days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" data-testid="button-more-filters">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(statusFilter || ageFilter) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {statusFilter && (
            <Badge
              variant="secondary"
              className="gap-1"
              data-testid="badge-filter-status"
            >
              Status: {statusFilter}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeFilter("status")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {ageFilter && (
            <Badge
              variant="secondary"
              className="gap-1"
              data-testid="badge-filter-age"
            >
              Age: {ageFilter} days
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeFilter("age")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter(undefined);
              setAgeFilter(undefined);
              applyFilters(searchTerm, undefined, undefined);
            }}
            data-testid="button-clear-filters"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
