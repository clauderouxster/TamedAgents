;Date: 24/03/2026
;Author: Claude Roux
;Description: Injection brute sans virer les commentaires

(defmacro espace(x) (size (takelist (\(c) (or (= c "\t") (= c " "))) x)))
(defmacro inc(i) (+= (@ i 0) 1))
(defmacro dec(i) (-= (@ i 0) 1))
(defmacro labl(ligne) (trim (@@ (trim  ligne) 0 " "))) 


; We inject the closing tags
(defun insert_label (code i root labels ref)
   (while (< (car i) (size code))
      (setq ligne (@ code (car i)))
      (setq clr (trim ligne))
      (ncheck (size clr)
         (inc i)
         (setq cpt (espace ligne))
         (inc i)
         (ife (and 
               (eq cpt ref) 
               (eq (@ clr -1) ":")
               (or (eq (@@ clr 0 4) "else")
                  (eq (@@ clr 0 6) "except")
                  (eq (@@ clr 0 5) "catch")
                  (eq (@@ clr 0 4) "elif")))
            (push labels (@@ (trimright ligne) 0 -1))

            (check (and ref (<= cpt ref))
               (dec i)
               (return)
            )
            (ncheck (eq (@ clr -1) ":")
               (if cpt
                  (push labels ligne)
                  (push root ligne)
               )
               (setq r (list (@@ (trimright ligne) 0 -1)))
               (if cpt
                  (push labels r)
                  (push root r)
               )
               (setq v ())
               (insert_label code i root v cpt)
               (if (in clr " ")
                  (setq closing_tag (+ "end" (@@ clr 0 " ")))
                  (setq closing_tag (+ "end" (@@ clr 0 ":"))))

               (if (eq closing_tag "end")
                  (throw (+ "Error: check indentation at line: " (trim ligne) "(" (@ i 0) ")")))
               (push r v)
            )
         )
      )
   )
)

(defun injecte_labels(code)
   (setq code (split (trim . string code) "\n"))
   (setq labels ())
   (insert_label code '(0) labels labels 0)
   (setq result ())
   (setq chaine "")
   (loop e labels
      (if (consp e)
         (block
            (check chaine
               (pushfirst e (trim chaine))
               (setq chaine ""))
            (push result e))      
      (+= chaine e "\n"))
)
(if chaine
   (push result chaine))
result)


(setq code (fread (+ _current "../app.py")))
(setq r (injecte_labels code))

(loop e r
   (println e "\n"))

