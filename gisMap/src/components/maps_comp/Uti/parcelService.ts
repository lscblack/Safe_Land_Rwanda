// services/parcelService.ts

import type { ParcelInfo } from ".";


export async function fetchParcelDetails(upi: string, parcel: any, api: any): Promise<ParcelInfo> {
    // Get area from parcel first
    const area = parcel.parcel_area_sqm || 
                 parcel.size || 
                 parcel.status_details?.area || 
                 parcel.area;

    let mergedInfo: ParcelInfo = {
        upi: upi,
        area: area,
        size: area,
        owners: [],
        images: [],
        transactionStatus: {
            inTransaction: false,
            underMortgage: false,
            hasCaveat: false,
        },
        location: {},
        overlapping: parcel?.overlapping,
        coordinates: parcel?.coordinates,
        uploaderId: parcel?.uploader_id,
        uploaderName: parcel?.uploader_name,
        uploaderEmail: parcel?.uploader_email,
        uploaderRole: parcel?.uploader_role,
        isOwnedByUser: true,
    };

    let externalDataError = false;
    let propertyDataError = false;
    let verificationFailed = false;
    let dataSource: 'external' | 'property' | 'both' | 'none' = 'none';

    try {
        // Try external API
        try {
            const externalResponse = await api.post('/api/external/parcel', {
                upi: upi,
                owner_id: "string"
            });

            const externalData = externalResponse.data;

            if (externalData) {
                dataSource = 'external';

                mergedInfo = {
                    ...mergedInfo,
                    area: externalData.size || externalData.area || mergedInfo.area,
                    size: externalData.size || externalData.area || mergedInfo.size,
                    landUse: externalData.landUseNameEnglish || externalData.landUse,
                    landUseNameEnglish: externalData.landUseNameEnglish,
                    landUseNameKinyarwanda: externalData.landUseNameKinyarwanda,
                    landUseCode: externalData.landUseCode,
                    rightType: externalData.rightType,
                    coordinateReferenceSystem: externalData.coordinateReferenceSystem,
                    xCoordinate: externalData.xCoordinate,
                    yCoordinate: externalData.yCoordinate,
                    remainingLeaseTerm: externalData.remainingLeaseTerm,
                    owners: externalData.owners?.map((owner: any) => ({
                        fullName: owner.fullName,
                        sharePercentage: owner.sharePercentage,
                        idNo: owner.idNo,
                        idTypeName: owner.idTypeName,
                        countryName: owner.countryName,
                        gender: owner.gender,
                        maritalStatus: owner.maritalStatus,
                    })) || [],
                    representative: externalData.representative ? {
                        foreNames: externalData.representative.foreNames,
                        surname: externalData.representative.surname,
                        idNo: externalData.representative.idNo,
                        idTypeName: externalData.representative.idTypeName,
                        countryName: externalData.representative.countryName,
                        gender: externalData.representative.gender,
                        maritalStatus: externalData.representative.maritalStatus,
                        address: externalData.representative.address,
                    } : undefined,
                    transactionStatus: {
                        ...mergedInfo.transactionStatus,
                        inProcess: externalData.inProcess,
                        isUnderMortgage: externalData.isUnderMortgage,
                        isUnderRestriction: externalData.isUnderRestriction,
                        underMortgage: externalData.isUnderMortgage || false,
                        hasCaveat: externalData.isUnderRestriction || false,
                    },
                    location: {
                        ...mergedInfo.location,
                        parcelLocation: externalData.parcelLocation || externalData.parcel_location,
                        village: externalData.parcelLocation?.village?.villageName ||
                            externalData.parcel_location?.village?.villageName,
                        cell: externalData.parcelLocation?.cell?.cellName ||
                            externalData.parcel_location?.cell?.cellName,
                        sector: externalData.parcelLocation?.sector?.sectorName ||
                            externalData.parcel_location?.sector?.sectorName,
                        district: externalData.parcelLocation?.district?.districtName ||
                            externalData.parcel_location?.district?.districtName,
                        province: externalData.parcelLocation?.province?.provinceName ||
                            externalData.parcel_location?.province?.provinceName,
                    },
                    coordinates: externalData.coordinates || mergedInfo.coordinates,
                    plannedLandUses: externalData.plannedLandUses,
                    valuation: externalData.valuationValue ? {
                        minPrice: externalData.valuationValue.minPrice,
                        maxPrice: externalData.valuationValue.maxPrice,
                        amount: parseFloat(externalData.valuationValue.maxPrice || '0'),
                        date: new Date().toISOString(),
                        valuator: 'External System',
                    } : undefined,
                    estimatedAmount: externalData.valuationValue?.maxPrice ?
                        parseFloat(externalData.valuationValue.maxPrice) : undefined,
                };
            }
        } catch (externalErr) {
            console.warn("External API failed:", externalErr);
            externalDataError = true;
        }

        // Try property API
        try {
            const propertyResponse = await api.get(`/api/property/properties/by-upi/${encodeURIComponent(upi)}`);
            const propertyData = propertyResponse.data;

            if (propertyData) {
                dataSource = dataSource === 'external' ? 'both' : 'property';

                const isPublished = propertyData.status === 'published';

                if (!isPublished) {
                    verificationFailed = true;
                }

                mergedInfo = {
                    ...mergedInfo,
                    area: propertyData.size || propertyData.area || mergedInfo.area,
                    size: propertyData.size || propertyData.area || mergedInfo.size,
                    landUse: propertyData.land_use || propertyData.landUse || mergedInfo.landUse,
                    rightType: propertyData.right_type || mergedInfo.rightType,
                    estimatedAmount: propertyData.estimated_amount || mergedInfo.estimatedAmount,
                    images: propertyData.images || mergedInfo.images,
                    documents: propertyData.documents || mergedInfo.documents,
                    owners: propertyData.parcel_information?.owners?.length ?
                        propertyData.parcel_information.owners : mergedInfo.owners,
                    representative: propertyData.parcel_information?.representative || mergedInfo.representative,
                    remainingLeaseTerm: propertyData.parcel_information?.remaining_lease_term || mergedInfo.remainingLeaseTerm,
                    transactionStatus: {
                        ...mergedInfo.transactionStatus,
                        inTransaction: propertyData.details?.inTransaction || mergedInfo.transactionStatus.inTransaction,
                        underMortgage: propertyData.details?.underMortgage || mergedInfo.transactionStatus.underMortgage,
                        hasCaveat: propertyData.details?.hasCaveat || mergedInfo.transactionStatus.hasCaveat,
                        status: propertyData.status,
                        isPublished: propertyData.status === 'published',
                    },
                    location: {
                        ...mergedInfo.location,
                        village: propertyData.village || mergedInfo.location.village,
                        cell: propertyData.cell || mergedInfo.location.cell,
                        sector: propertyData.sector || mergedInfo.location.sector,
                        district: propertyData.district || mergedInfo.location.district,
                        province: propertyData.provinceNameEnglish || mergedInfo.location.province,
                    },
                    valuation: propertyData.valuation || mergedInfo.valuation,
                };
            }
        } catch (propertyErr) {
            console.warn("Property API failed:", propertyErr);
            propertyDataError = true;
        }

        mergedInfo.externalDataError = externalDataError;
        mergedInfo.propertyDataError = propertyDataError;
        mergedInfo.verificationFailed = verificationFailed;
        mergedInfo.dataSource = dataSource;

    } catch (err) {
        console.error("Failed to load parcel info:", err);
        mergedInfo.externalDataError = true;
        mergedInfo.propertyDataError = true;
        mergedInfo.verificationFailed = true;
        mergedInfo.dataSource = 'none';
    }

    return mergedInfo;
}