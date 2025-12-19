import pandas as pd
import spacy
from rapidfuzz import process, fuzz
from sqlalchemy import text

class ComponentMatcher:
    def __init__(self, source=None, engine=None):
        """
        source:
          - if engine is None: path to CSV (old behavior)
          - if engine is provided: table name (default 'machine_details')
        engine:
          - SQLAlchemy engine (from your get_engine())
        """
        self.engine = engine
        self.machine_table = source or "machine_details"
        self.fuzzy_cutoff = 50
        
        if self.engine is None:
            self.df = pd.read_csv(source)
        else:
            self.df = pd.read_sql_query(
                f"SELECT * FROM {self.machine_table}",
                self.engine
            )

        self.nlp = spacy.load("en_core_web_sm")
        
        # Build searchable list from machine_details (use both name + internal_part_name)
        self.component_terms = (
            self.df[["name", "internal_part_name"]]
            .fillna("")
            .astype(str)
            .agg(" ".join, axis=1)
            .str.strip()
            .tolist()
        )

        
        self.supplier_df = None
        self.supplier_terms = None
    
    def _extract_nouns(self, text):
        """
        Minimal keyword extractor using spaCy POS tags.
        Includes NOUN/PROPN + ADJ (since you said you're using adjectives too).
        Returns: list[str]
        """
        doc = self.nlp(text)
        return [
            tok.text
            for tok in doc
            if tok.pos_ in {"NOUN", "PROPN", "ADJ"}
            and not tok.is_stop
            and (tok.is_alpha or "-" in tok.text)
        ]
    
    def _best_fuzzy_match(self, query: str, choices: list[str]):
        """
        Returns: (best_match_text, score_0_100, index_in_choices)
        """
        if not choices:
            return ("", 0.0, -1)

        match = process.extract(query, choices, scorer=fuzz.WRatio)
        if match is None:
            return ("", 0.0, -1)
        
        return [(t, float(s), int(i)) for (t, s, i) in match]

        
    def _load_suppliers(self, supplier_table="supplier_master"):
        """Load supplier_master once (only if supplier_details=True)."""
        if self.engine is None:
            raise ValueError("supplier_details=True requires a DB engine.")

        if self.supplier_df is None:
            self.supplier_df = pd.read_sql_query(
                f"SELECT * FROM {supplier_table}",
                self.engine
            )

            # searchable supplier strings
            self.supplier_terms = (
                self.supplier_df[["supplier_name", "primary_contact_name"]]
                .fillna("")
                .astype(str)
                .agg(" ".join, axis=1)
                .str.strip()
                .tolist()
            )

    

    def find_components(self, texts, supplier_details: bool = False):
        """
        Returns:
          components_df, suppliers_df
        suppliers_df is empty unless supplier_details=True.
        """
        if isinstance(texts, str):
            texts = [texts]

        
        keywords = []
        for t in texts:
            keywords.extend(self._extract_nouns(t))  

        # identifying component matches
        comp_matches = self._fuzzy_match_to_df(
            keywords=keywords,
            choices=self.component_terms,
            base_df=self.df,
            matched_text_col="matched_component_text",
        )

        # identifying supplier matches
        if supplier_details:
            self._load_suppliers()
            supp_matches = self._fuzzy_match_to_df(
                keywords=keywords,
                choices=self.supplier_terms,
                base_df=self.supplier_df,
                matched_text_col="matched_supplier_text",
            )
        else:
            supp_matches = pd.DataFrame()

        return comp_matches, supp_matches

    def _fuzzy_match_to_df(self, keywords, choices, base_df, matched_text_col):
        """
        Tiny wrapper so you don't duplicate fuzzy matching code.
        Replace the inside with YOUR existing fuzzy match logic.
        Must return a DataFrame of matched rows + score + keyword + matched_text_col.
        """
        hits = []

        for kw in keywords:
            matches = self._best_fuzzy_match(kw, choices)
            for rank, (best_match_text, score, idx) in enumerate(matches, start=1):
                row = base_df.iloc[idx].to_dict()
                row.update({
                    "matched_keyword": kw,
                    "match_score": score,
                    "match_rank": rank,          
                    matched_text_col: best_match_text,
                    "choice_index": idx,         
                })
                hits.append(row)

        return pd.DataFrame(hits)
    
    def build_child_parent_df(self, comp_df: pd.DataFrame, engine, table="machine_details", id_col="item"):
        
        child_ids = comp_df[id_col].dropna().astype(str).unique().tolist()
        
        pairs = []
        parent_ids = set()
        for cid in child_ids:
            parts = cid.split(".")
            for k in range(1, len(parts)):  
                pid = ".".join(parts[:k])
                pairs.append((cid, pid))
                parent_ids.add(pid)
        
        
        all_ids = list(set(child_ids) | parent_ids)
        if not all_ids:
            return pd.DataFrame()
        
        q = text(f"SELECT * FROM {table} WHERE {id_col} = ANY(:ids)")
        all_rows = pd.read_sql(q, engine, params={"ids": all_ids})
        
        children_df = (
            all_rows[all_rows[id_col].isin(child_ids)]
            .copy()
            .assign(role="child", child_item_id=lambda d: d[id_col])
        )
        
        parent_map = pd.DataFrame(pairs, columns=["child_item_id", "parent_item_id"])
        parents_df = (
            parent_map.merge(all_rows, left_on="parent_item_id", right_on=id_col, how="left")
            .drop(columns=["parent_item_id"])
            .assign(role="parent")
        )
        print('concating')
        
        out = pd.concat([children_df, parents_df], ignore_index=True)

        return out
