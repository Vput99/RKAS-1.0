import { SchoolProfile } from '../../types';

export type LetterTab = 'list' | 'form-ekskul' | 'form-tukang' | 'form-honor' | 'form-upah-tukang' | 'form-roolstaat';
export type LetterFilterType = 'all' | 'ekstrakurikuler' | 'tukang';

export interface LetterMakerProps {
  schoolProfile?: SchoolProfile | null;
}
