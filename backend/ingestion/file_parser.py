import os
import csv
from typing import Tuple, Optional
import polars as pl
from schemas.ingestion import TargetEntity
from ingestion.normalizer import DeterministicNormalizer

MAX_HEADER_SAMPLE_BYTES = 8192

def detect_csv_separator(file_path: str, encoding: str = "utf-8") -> str:
    """Detecta de forma heurística el delimitador del archivo CSV."""
    separators = [",", ";", "\t", "|"]
    best_sep = ","
    max_fields = 0

    try:
        with open(file_path, "r", encoding=encoding, errors="ignore") as f:
            sample_lines = [f.readline() for _ in range(5)]
            sample_text = "\n".join([line for line in sample_lines if line.strip()])
            
            # Intentar con csv.Sniffer
            try:
                dialect = csv.Sniffer().sniff(sample_text, delimiters=",;\t|")
                return dialect.delimiter
            except Exception:
                pass

            # Heurística basada en consistencia de columnas
            for sep in separators:
                field_counts = [len(line.split(sep)) for line in sample_lines if line.strip()]
                if field_counts and len(set(field_counts)) == 1 and field_counts[0] > max_fields:
                    max_fields = field_counts[0]
                    best_sep = sep
    except Exception:
        pass

    return best_sep

def detect_encoding(file_path: str) -> str:
    """Prueba secuencias de decodificación seguras (UTF-8, Latin-1, CP1252)."""
    encodings = ["utf-8", "latin-1", "cp1252"]
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                f.read(MAX_HEADER_SAMPLE_BYTES)
            return enc
        except UnicodeDecodeError:
            continue
    return "latin-1"

class FileParser:
    """Extractor seguro y de alto rendimiento de archivos CSV y Excel (.xlsx) con Polars."""

    @classmethod
    def read_file(cls, file_path: str) -> pl.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Archivo no encontrado en ruta: {file_path}")

        path_lower = file_path.lower()
        if path_lower.endswith(".csv"):
            return cls._read_csv(file_path)
        elif path_lower.endswith(".xlsx") or path_lower.endswith(".xls"):
            return cls._read_excel(file_path)
        else:
            raise ValueError("Formato de archivo no soportado. Debe ser .csv o .xlsx")

    @classmethod
    def _read_csv(cls, file_path: str) -> pl.DataFrame:
        encoding = detect_encoding(file_path)
        separator = detect_csv_separator(file_path, encoding=encoding)
        
        try:
            df = pl.read_csv(
                file_path,
                separator=separator,
                encoding=encoding,
                ignore_errors=True,
                infer_schema_length=0 # Leer todo inicialmente como texto para saneamiento seguro en pipeline
            )
            return df
        except Exception as e:
            # Fallback seguro con pandas si polars detecta estructura compleja
            import pandas as pd
            df_pd = pd.read_csv(file_path, sep=separator, encoding=encoding, on_bad_lines="skip", dtype=str)
            return pl.from_pandas(df_pd)

    @classmethod
    def _read_excel(cls, file_path: str) -> pl.DataFrame:
        try:
            # Utilizar Polars con motor openpyxl
            df = pl.read_excel(file_path, engine="openpyxl", schema_overrides=None)
            # Convertir todas las columnas a string para saneamiento homogéneo
            exprs = [pl.col(c).cast(pl.String) for c in df.columns]
            return df.with_columns(exprs)
        except Exception as e:
            import pandas as pd
            df_pd = pd.read_excel(file_path, engine="openpyxl", dtype=str)
            return pl.from_pandas(df_pd)

    @classmethod
    def parse_and_normalize(
        cls, 
        file_path: str, 
        entity: TargetEntity, 
        manual_override: Optional[dict] = None
    ) -> pl.DataFrame:
        """Lee el archivo y aplica la normalización semántica determinista."""
        df_raw = cls.read_file(file_path)
        if df_raw.is_empty():
            raise ValueError("El archivo cargado se encuentra vacío o sin filas válidas.")
        
        df_normalized = DeterministicNormalizer.normalize_polars_df(
            df_raw, 
            entity=entity, 
            manual_override=manual_override
        )
        return df_normalized
