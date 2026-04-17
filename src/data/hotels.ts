export interface Hotel {
  id: string; // Internal unique ID
  hotel_id: string; // Column A
  url: string; // Column B
  name: string; // Column C
  gallery_html: string; // Column D
  description_html: string; // Column E
  map_url?: string; // Column F
  location?: string; // Column G
  address?: string; // Column H
  price?: string; // Column I
  rating?: string; // Column J
  location_id?: string; // Column K
  contact_name?: string; // Column L
  contact_phone?: string; // Column M
  update_time: string; // Column N
}

export const TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQT7lw-MzWC0abldDLbCtrIgreJhcEnYPGt7a8vKGFrR1TSAuOf7Iq3uzztoedfLIIjO6mRnS61YdOa/pub?output=tsv';

// Dán URL Web App từ Google Apps Script vào đây để lưu bình luận
export const REVIEWS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDeymsHwW4dJvw09uhWNYxKRIlrgMi1wskK8cXndhwylwbkdF2ii6vKFbsV5FkETQDQA/exec'; 

// URL TSV để đọc bình luận
export const REVIEWS_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTB1CnhO3PL56Av3q-qQW56Iy_G4rHOY7pWC1bBcE2fE16LjW3jzhl85RPaStwXZjHcFp58xPEECC7/pub?output=tsv';
