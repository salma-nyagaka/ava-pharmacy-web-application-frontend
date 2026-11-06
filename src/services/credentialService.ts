import { apiClient } from '../lib/apiClient'
export interface PharmacistCredential { id:number; user:number; user_name:string; license_number:string|null; license_country:string; license_board:string; license_expiry:string|null; credential_evidence:number|null; credential_status:'pending'|'verified'|'suspended'; credential_is_current:boolean; credential_verified_at:string|null; permissions:string[] }
export interface CredentialSubject {id:number;name:string;role:string}
export interface LicenceEvidence {id:number;title:string;reference_number:string;verified_at:string|null;expires_at:string|null}
export const unwrap = <T,>(response:{data:any}):T => response.data?.data ?? response.data
export const collection = <T,>(response:{data:any}):T[] => {const value=unwrap<any>(response);return Array.isArray(value)?value:value?.results??[]}
export const credentialService = {
  async list(own=false){const response=await apiClient.get(own?'/compliance/pharmacist-credentials/me/':'/compliance/pharmacist-credentials/');return own?[unwrap<PharmacistCredential>(response)]:collection<PharmacistCredential>(response)},
  async subjects(search=''){return collection<CredentialSubject>(await apiClient.get('/compliance/pharmacist-credential-subjects/',{params:{search}}))},
  async evidence(){return collection<LicenceEvidence>(await apiClient.get('/compliance/evidence/',{params:{evidence_type:'professional_credential',status:'active'}}))},
  async save(id:number|null,payload:Record<string,unknown>){const url='/compliance/pharmacist-credentials/'+(id?`${id}/`:'');return unwrap<PharmacistCredential>(await (id?apiClient.patch(url,payload):apiClient.post(url,payload)))},
  async action(id:number,action:'verify'|'suspend',reference:string){return unwrap<PharmacistCredential>(await apiClient.post(`/compliance/pharmacist-credentials/${id}/${action}/`,{verification_reference:reference}))}
}
