import { publicTableService } from "@/services/publicTableService";
import { useQuery } from "@tanstack/react-query";

export const useClientOrders = (token: string) => {

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-table-orders", token],
    queryFn: () => publicTableService.listOrders(token),
    enabled: !!token,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  return {
    orders: data?.orders ?? [],
    isLoadingOrders: isLoading,
    isErrorOrders: isError,
    refetchOrders: refetch,
  };
};
