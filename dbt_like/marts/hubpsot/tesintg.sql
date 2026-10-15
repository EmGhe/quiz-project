WITH compute AS (
  SELECT *,
  ROW_NUMBER() OVER(PARTITION BY deal_name, activity_exchange ORDER BY activity_date)AS each_exchange_number,
  DATE_DIFF(DATE(LEFT(activity_date,10)),DATE(LEFT(previous_activity_date,10)),day) AS diff_between_activities

  FROM (
    SELECT 
        a.*,
        CASE 
          WHEN activity_type = 'Email sent to contact' THEN 'Activity done by sales only'
          ELSE 'Activity shared by sales and clients'
        END AS activity_exchange,
        
        CASE 
          WHEN EXTRACT(dayofweek FROM DATE(LEFT(activity_date,10))) IN (1,7) OR n.date IS NOT NULL then TRUE
          ELSE FALSE
        END AS is_weekend,

      --  LAG(activity_type) OVER (PARTITION BY deal_name ORDER BY activity_date) AS previous_activity_date

    FROM hubspotUS.sales_activity_analysis AS a
    LEFT JOIN extractions.national_holidays AS n
      ON DATE(LEFT(activity_date,10)) = n.date
    INNER JOIN (
      SELECT 
      deal_name,
      COUNT(*) activity_nb

      FROM hubspotUS.sales_activity_analysis
      WHERE DATE(LEFT(activity_date,10)) >= '2023-01-01'
      GROUP BY 1
      HAVING activity_nb > 5
    ) USING(deal_name)
  WHERE deal_number = '1st Deal' -- To Exclude once finished
  )
),

compute_activities AS (
  SELECT 
    deal_name,
      CASE
    WHEN dealstage_funnel = 'Top Funnel' THEN '1.Top Funnel'
    WHEN dealstage_funnel = 'Mid Funnel' THEN '2.Mid Funnel'
    WHEN dealstage_funnel = 'Bottom Funnel' THEN '3.Bottom Funnel'
    WHEN dealstage_funnel = 'On Hold' THEN '0.On Hold'
    WHEN dealstage_funnel = 'No Funnel' THEN '0.No Funnel'
    WHEN dealstage_funnel IN ('Closed won','Closed lost') THEN '0.Closed won/lost'
    ELSE dealstage_funnel
  END AS dealstage_funnel_ordered,
    activity_type,
    COUNT(*) nb_of_activities,
    COUNT(CASE WHEN activity_exchange = 'Activity done by sales only' THEN activity_exchange END) nb_of_activities_done_by_sales_only,
    COUNT(CASE WHEN activity_exchange = 'Activity shared by sales and clients' THEN activity_exchange END) nb_of_activities_shared_by_sales_and_clients,
    COUNT(CASE WHEN activity_exchange = 'Activity shared by sales and clients' THEN activity_exchange END) / COUNT(*) AS percentage_of_activities_shared_by_sales_and_clients,
    COUNT(CASE WHEN activity_type = 'Meeting' THEN activity_exchange END) nb_of_meetings,
    COUNT(CASE WHEN activity_type = 'Call' THEN activity_exchange END) nb_of_calls,
    COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_exchange END)AS  nb_of_client_email_replies

  FROM compute
  GROUP BY 1,2,3
),

compute_activities_per_funnel_only AS (
  SELECT 
    deal_name,
    client_type,
      CASE
    WHEN dealstage_funnel = 'Top Funnel' THEN '1.Top Funnel'
    WHEN dealstage_funnel = 'Mid Funnel' THEN '2.Mid Funnel'
    WHEN dealstage_funnel = 'Bottom Funnel' THEN '3.Bottom Funnel'
    WHEN dealstage_funnel = 'On Hold' THEN '0.On Hold'
    WHEN dealstage_funnel = 'No Funnel' THEN '0.No Funnel'
    WHEN dealstage_funnel IN ('Closed won','Closed lost') THEN '0.Closed won/lost'
    ELSE dealstage_funnel
  END AS dealstage_funnel_ordered,
    COUNT(*) nb_of_activities,
    AVG(diff_between_activities) AS avg_diff_between_activities,
      COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END) AS nb_of_email_sent,
            COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END) AS nb_of_email_replies,
    COUNT(CASE WHEN activity_exchange = 'Activity shared by sales and clients' THEN activity_exchange END) / COUNT(*) AS percentage_of_activities_shared_by_sales_and_clients,
    COUNT(CASE WHEN activity_type = 'Meeting' THEN activity_exchange END) nb_of_meetings,
    COUNT(CASE WHEN activity_type = 'Call' THEN activity_exchange END) nb_of_calls,

  CASE 
    WHEN COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END) = 0
        AND COUNT(CASE WHEN activity_type = 'Meeting' THEN activity_type END) > 0
    THEN COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END) / NULLIF(COUNT(CASE WHEN activity_type = 'Meeting' THEN activity_type END),0)
    WHEN COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END) = 0
        AND COUNT(CASE WHEN activity_type = 'Meeting' THEN activity_type END) = 0
        AND COUNT(CASE WHEN activity_type = 'Call' THEN activity_type END) > 0
    THEN COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END) / NULLIF(COUNT(CASE WHEN activity_type = 'Call' THEN activity_type END),0)
    WHEN COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END) = 0
        AND COUNT(CASE WHEN activity_type = 'Meeting' THEN activity_type END) = 0
        AND COUNT(CASE WHEN activity_type = 'Call' THEN activity_type END) = 0
    THEN COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END)
    ELSE
     COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END) / NULLIF(COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END),0) 
  END AS index_emails_between_sales_and_clients,

  CASE 
    WHEN COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END) > 0 
    THEN COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END) / NULLIF(COUNT(CASE WHEN activity_type = 'Email reply from contact' THEN activity_type END),0)
    ELSE COUNT(CASE WHEN activity_type = 'Email sent to contact' THEN activity_type END)
  END AS index_emails_between_sales_and_clients_mails_only

  FROM compute
  GROUP BY 1,2,3
),

switching AS (
SELECT 
*,
  CASE
    WHEN LAG(activity_exchange) OVER (PARTITION BY deal_name ORDER BY activity_date) != activity_exchange THEN activity_date
    WHEN each_exchange_number = 1 THEN activity_date
    ELSE NULL
  END AS switch_activity_type_date,
  LAG(activity_exchange) OVER (PARTITION BY deal_name ORDER BY activity_date) AS previous_activity_exchange,
  LEAD(activity_exchange) OVER (PARTITION BY deal_name ORDER BY activity_date) AS next

FROM (SELECT 
      *,
      IF(activity_exchange != LAG(activity_exchange) OVER (PARTITION BY deal_name ORDER BY activity_date) OR LAG(activity_exchange) OVER (PARTITION BY deal_name ORDER BY activity_date) IS NULL, TRUE, FALSE) AS change_flag --to detect when a client is sending multiple mails before we answer them
      FROM compute
)
WHERE change_flag = true -- to keep the oldest reply of a client, if we have several mails from them before a sales answers
),

final AS (
SELECT
  *,
  CASE
    WHEN CONCAT(switch_date_sales,switch_date_client) = '' THEN NULL 
    ELSE CONCAT(switch_date_sales,switch_date_client)
  END AS switch_between_client_and_sales_only,
FROM ( SELECT *,
              CASE
                WHEN previous_activity_exchange = 'Activity shared by sales and clients' AND activity_exchange = 'Activity done by sales only' THEN activity_date
                ELSE ''
              END AS switch_date_client,

              CASE
                WHEN next = 'Activity done by sales only' AND activity_exchange = 'Activity shared by sales and clients' THEN activity_date
                ELSE ''
              END AS switch_date_sales,
            FROM
              switching
      )
),

date_difference AS (
SELECT 
  *,
  LEAD(switch_activity_type_date) OVER (PARTITION BY deal_name ORDER BY switch_activity_type_date) next_activity_exchange,
  LEAD(switch_between_client_and_sales_only) OVER (PARTITION BY deal_name ORDER BY switch_between_client_and_sales_only) next_activity_exchange_between_client_and_sales
  

FROM final
--WHERE switch_activity_type_date IS NOT NULL
ORDER BY activity_date
),

deal_age AS (
  SELECT 
    deal_name,
    CASE
      WHEN dealstage_funnel = 'Top Funnel' THEN '1.Top Funnel'
      WHEN dealstage_funnel = 'Mid Funnel' THEN '2.Mid Funnel'
      WHEN dealstage_funnel = 'Bottom Funnel' THEN '3.Bottom Funnel'
      WHEN dealstage_funnel = 'On Hold' THEN '0.On Hold'
      WHEN dealstage_funnel = 'No Funnel' THEN '0.No Funnel'
      WHEN dealstage_funnel IN ('Closed won','Closed lost') THEN '0.Closed won/lost'
    ELSE dealstage_funnel
  END AS dealstage_funnel_ordered,

  DATE_DIFF(MAX(CASE WHEN is_weekend = TRUE THEN NULL ELSE DATE(LEFT(activity_date,10))END),
            MIN(CASE WHEN is_weekend = TRUE THEN NULL ELSE DATE(LEFT(activity_date,10))END),
            day) AS total_deal_duration_days 
 -- DATE_DIFF(MAX(DATE(LEFT(activity_date,10))),MIN(DATE(LEFT(activity_date,10))),day) AS total_deal_duration_days 
  FROM compute
  GROUP BY 1,2
),

df AS (
SELECT
  *,
  CASE
    WHEN dealstage_funnel = 'Top Funnel' THEN '1.Top Funnel'
    WHEN dealstage_funnel = 'Mid Funnel' THEN '2.Mid Funnel'
    WHEN dealstage_funnel = 'Bottom Funnel' THEN '3.Bottom Funnel'
    WHEN dealstage_funnel = 'On Hold' THEN '0.On Hold'
    WHEN dealstage_funnel = 'No Funnel' THEN '0.No Funnel'
    WHEN dealstage_funnel IN ('Closed won','Closed lost') THEN '0.Closed won/lost'
    ELSE dealstage_funnel
  END AS dealstage_funnel_ordered,
  DATE_DIFF(DATE(LEFT(next_activity_exchange,10)),DATE(LEFT(switch_activity_type_date,10)), day) diff_between_exchange,
  CASE
    WHEN activity_exchange = 'Activity done by sales only' THEN NULL 
    ELSE DATE_DIFF(PARSE_TIMESTAMP('%Y-%m-%d %H:%M',next_activity_exchange_between_client_and_sales),PARSE_TIMESTAMP('%Y-%m-%d %H:%M',switch_between_client_and_sales_only), day) 
  END AS diff_between_client_answering_and_sales_responding
FROM date_difference
ORDER BY 2
),

df_final AS (
SELECT 
  associated_company,
  deal_name,
  deal_creation_date, 
  deal_stage,
  revenue_type,
  closed_lost_reason,
  deal_number,
  dealstage_funnel_ordered,
  activity_type,
  client_stage,
  client_type,
  CASE 
    WHEN closed_lost_reason IS NULL then 'Won Deal' 
    ELSE closed_lost_reason
  END AS closed_reason,
  nb_of_activities,
  nb_of_activities / NULLIF(total_deal_duration_days,0)  age_of_deal,
  --ROUND(AVG(diff_between_exchange),2) avg_diff_between_exchange,
  ROUND(AVG(diff_between_client_answering_and_sales_responding),2) diff_between_client_answering_and_sales_responding

FROM df
LEFT JOIN compute_activities USING(deal_name,dealstage_funnel_ordered,activity_type)
LEFT JOIN deal_age USING(deal_name,dealstage_funnel_ordered)
GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14
),


analysis AS (

SELECT 
*

FROM df_final
),

test AS (
SELECT 

  *,
  /*
  CASE 
    WHEN final_score = 3 THEN 'driver'
    WHEN final_score = 2 THEN 'intermediate'
    WHEN final_score = 1 THEN 'dragger'
  END AS type_of_deal,
  */
  

  ROUND((1 - (diff_between_client_answering_and_sales_responding / MAX(diff_between_client_answering_and_sales_responding) OVER ())),2) AS score_per_funnel

FROM analysis
--LEFT JOIN (SELECT deal_name, final_score FROM `hubspotUS.deals_exchange_score`) USING(deal_name)
),
 
final_output AS ( 
SELECT 
* 
FROM test
ORDER BY deal_name
),

-- New Scoring per Funnel:
normalized_sales_answer_to_client AS (
SELECT 
*,

1 - ((diff_between_client_answering_and_sales_responding - MIN(diff_between_client_answering_and_sales_responding) OVER (PARTITION BY activity_type,dealstage_funnel_ordered,client_type)) / NULLIF((MAX(diff_between_client_answering_and_sales_responding) OVER (PARTITION BY activity_type,dealstage_funnel_ordered,client_type) - MIN(diff_between_client_answering_and_sales_responding) OVER (PARTITION BY activity_type,dealstage_funnel_ordered,client_type)),0)) AS normalized_sales_answer_to_client_by_activity_byfunnel,

FROM final_output
WHERE activity_type != 'Email sent to contact'
ORDER BY 1,2,3
),

normalized_balance_between_sales_and_client AS (
  SELECT * FROM final_output
),

avg_sales_answer_by_funnel AS (
  SELECT
    deal_name,
    dealstage_funnel_ordered,
    associated_company,
    client_stage,
    client_type,
    deal_creation_date, 
    deal_stage,
    revenue_type,
    closed_lost_reason,
    deal_number,
    AVG(diff_between_client_answering_and_sales_responding) avg_diff_between_client_answering_and_sales_responding,
    AVG(normalized_sales_answer_to_client_by_activity_byfunnel) AS normalized_sales_answer_to_client_by_activity_byfunnel,
    AVG(normalized_sales_answer_to_client_by_activity_byfunnel) AS normalized_sales_answer_to_client_by_activity
  FROM normalized_sales_answer_to_client
  WHERE normalized_sales_answer_to_client_by_activity_byfunnel IS NOT NULL
  GROUP BY 1,2,3,4,5,6,7,8,9,10
),

normalized_activity_volume AS (
SELECT 
  deal_name,
  dealstage_funnel_ordered,
  percentage_of_activities_shared_by_sales_and_clients,
  nb_of_meetings,
  nb_of_calls,
  nb_of_email_replies,
  index_emails_between_sales_and_clients,
  index_emails_between_sales_and_clients_mails_only,
  avg_diff_between_activities,
  
  (nb_of_activities - MIN(nb_of_activities) OVER (PARTITION BY dealstage_funnel_ordered,client_type)) / NULLIF((MAX(nb_of_activities) OVER (PARTITION BY dealstage_funnel_ordered,client_type) - MIN(nb_of_activities) OVER (PARTITION BY dealstage_funnel_ordered,client_type)),0) AS normalized_activity_by_funnel,

1 - ((avg_diff_between_activities - MIN(avg_diff_between_activities) OVER (PARTITION BY dealstage_funnel_ordered,client_type)) / NULLIF((MAX(avg_diff_between_activities) OVER (PARTITION BY dealstage_funnel_ordered,client_type) - MIN(avg_diff_between_activities) OVER (PARTITION BY dealstage_funnel_ordered,client_type)),0))  normalized_avg_diff_between_activities,

1 - ((index_emails_between_sales_and_clients - MIN(index_emails_between_sales_and_clients) OVER (PARTITION BY dealstage_funnel_ordered,client_type)) / NULLIF((MAX(index_emails_between_sales_and_clients) OVER (PARTITION BY dealstage_funnel_ordered,client_type) - MIN(index_emails_between_sales_and_clients) OVER (PARTITION BY dealstage_funnel_ordered,client_type)),0)) AS normalized_index_by_funnel,

(percentage_of_activities_shared_by_sales_and_clients - MIN(percentage_of_activities_shared_by_sales_and_clients) OVER (PARTITION BY dealstage_funnel_ordered,client_type)) / NULLIF((MAX(percentage_of_activities_shared_by_sales_and_clients) OVER (PARTITION BY dealstage_funnel_ordered,client_type) - MIN(percentage_of_activities_shared_by_sales_and_clients) OVER (PARTITION BY dealstage_funnel_ordered,client_type)),0) AS normalized_percentage_of_sales_between_sales_and_clients

FROM compute_activities_per_funnel_only
ORDER BY 1,2
),

activity_per_day_deal AS (
  SELECT 
    deal_name,
    dealstage_funnel_ordered,
    nb_of_activities,
    total_deal_duration_days,
    client_type,
    nb_of_activities / NULLIF(total_deal_duration_days,0) AS activity_per_day
  FROM compute_activities_per_funnel_only
  LEFT JOIN deal_age USING(deal_name,dealstage_funnel_ordered)

),

normalized_activity_per_day_volume AS (
SELECT 
  deal_name,
  dealstage_funnel_ordered,
  nb_of_activities,
  total_deal_duration_days,
  (activity_per_day - MIN(activity_per_day) OVER (PARTITION BY dealstage_funnel_ordered,client_type)) / NULLIF((MAX(activity_per_day) OVER (PARTITION BY dealstage_funnel_ordered,client_type) - MIN(activity_per_day) OVER (PARTITION BY dealstage_funnel_ordered,client_type)),0) AS normalized_activity_per_day_by_funnel
FROM activity_per_day_deal
ORDER BY 1,2
),

final_score_per_funnel AS (
  SELECT
  *
  FROM avg_sales_answer_by_funnel
  LEFT JOIN normalized_activity_volume USING(deal_name,dealstage_funnel_ordered)
  LEFT JOIN normalized_activity_per_day_volume USING(deal_name,dealstage_funnel_ordered)
),

compute_pre_score AS (
SELECT 
  *,
  normalized_activity_per_day_by_funnel 
  + 
  normalized_avg_diff_between_activities 
  + 
  normalized_sales_answer_to_client_by_activity_byfunnel 
--  + 
 -- normalized_index_by_funnel
   
  AS pre_score

FROM final_score_per_funnel
WHERE normalized_activity_per_day_by_funnel IS NOT NULL
),

final_scoring AS (
  SELECT
    *,

    CASE
      WHEN NTILE(3) OVER (PARTITION BY dealstage_funnel_ordered, client_type ORDER BY pre_score) = 1 THEN 'Dragger'
      WHEN NTILE(3) OVER (PARTITION BY dealstage_funnel_ordered, client_type ORDER BY pre_score) = 2 THEN 'Intermediate'
      WHEN NTILE(3) OVER (PARTITION BY dealstage_funnel_ordered, client_type ORDER BY pre_score) = 3 THEN 'Driver'
    END AS final_score_categ,

    NTILE(3) OVER (PARTITION BY dealstage_funnel_ordered ORDER BY pre_score) AS final_score

  FROM compute_pre_score
)

--SELECT * FROM final_scoring

-- SLIDE PPT :

,top_drivers AS (
SELECT 
DISTINCT deal_name
FROM final_scoring
WHERE client_type = 'Echo'
AND deal_number = '1st Deal'
--AND dealstage_funnel_ordered = '1.Top Funnel'
AND dealstage_funnel_ordered = '2.Mid Funnel'
AND final_score_categ = 'Dragger'

--AND deal_stage NOT IN ('Closed won','Closed lost')
),

top_analysis AS (
SELECT 
'TOP' AS funnel_process,
COUNT(DISTINCT deal_name) 
FROM top_drivers
LEFT JOIN final_scoring USING(deal_name)
WHERE dealstage_funnel_ordered = '1.Top Funnel'
GROUP BY 1
--WHERE dealstage_funnel_ordered = '2.Mid Funnel'
--WHERE dealstage_funnel_ordered = '3.Bottom Funnel'
--AND deal_number = '1st Deal'
),

mid_analysis AS (
SELECT 
'MID' AS funnel_process,
COUNT(DISTINCT deal_name) 
FROM top_drivers
LEFT JOIN final_scoring USING(deal_name)
WHERE dealstage_funnel_ordered = '2.Mid Funnel'
GROUP BY 1
--WHERE dealstage_funnel_ordered = '3.Bottom Funnel'
--AND deal_number = '1st Deal'
),


bot_analysis AS (
SELECT 
'BOTTOM' AS funnel_process,
COUNT(DISTINCT deal_name) 
FROM top_drivers
LEFT JOIN final_scoring USING(deal_name)
WHERE dealstage_funnel_ordered = '3.Bottom Funnel'
GROUP BY 1
--
--AND deal_number = '1st Deal'
),

unionize AS (
SELECT * FROM top_analysis
UNION ALL
SELECT * FROM mid_analysis
UNION ALL
SELECT * FROM bot_analysis
ORDER BY 1 DESC
),

final_query AS (
SELECT
*,
CASE
  WHEN ROW_NUMBER() OVER(PARTITION BY associated_company,deal_name ORDER BY dealstage_funnel_ordered DESC) = 1 THEN closed_lost_reason 
  ELSE NULL
END AS live_closed_lost_reason
FROM final_scoring
),

deals_for_testing AS (
SELECT 
DISTINCT deal_name, deal_creation_date
FROM final_query
WHERE client_type = 'Echo'
AND deal_name NOT LIKE '%Partnership%'
AND deal_name NOT IN ('SAMPLE REQUEST - ','Outra - PLA - UK')
),

deal_test_funnel AS (
SELECT 
DISTINCT 
  deal_name,   
  deal_stage, 
  DATE(deal_creation_date) deal_creation_date,
  DATE(date_change) date_change,

  CASE  
    WHEN UPPER(deal_stage) IN ('DISCOVERY CALL SCHEDULED','PRESENTATIONSCHEDULED','DISCOVERY PROCESS','APPOINTMENT SCHEDULED','SDR QUALIFICATION DONE','DISCOVERY') THEN '1.Top Funnel' --
    WHEN UPPER(deal_stage) IN ('PRICING PRESENTED','AE QUALIFICATION DONE','DATA EVALUATION','AE QUALIFICATION PROCESS') THEN '2.Mid Funnel' -- 
    WHEN UPPER(deal_stage) = 'NEGOTIATION' THEN '3.Bottom Funnel'
    ELSE NULL
  END AS dealstage_funnel

FROM deals_for_testing
LEFT JOIN hubspotUS.dealstage_evol_cleaned USING(deal_name)
WHERE deal_stage IS NOT NULL
AND deal_stage NOT IN ('Closed lost','Closed won','On Hold (client side)','On Hold (echo side)','On Hold - Client side')
QUALIFY ROW_NUMBER() OVER(PARTITION BY deal_name ORDER BY date_change DESC) = 1
),

activity_filters AS (
SELECT
  DISTINCT
  filtered_deals.*,
  activity_date,
  activity_type AS old_activity_type,

   CASE 
    WHEN activity_type = 'Task' AND task_type = 'Call' THEN 'Call'
    WHEN activity_type = 'Note' AND (LOWER(note_body) LIKE 'email sent%' OR LOWER(note_body) LIKE 'linkedin message sent%') THEN 'Email sent to contact'
    WHEN activity_type = 'Note' AND (LOWER(note_body) LIKE 'email replied%' OR LOWER(note_body) LIKE 'linkedin message replied%') THEN 'Email reply from contact'
    WHEN activity_type = 'Note' AND LOWER(note_body) LIKE 'discovery call%' THEN 'Meeting'
    ELSE activity_type
  END AS activity_type,
  email_body AS old_email_body,
  note_body,
  activity_assigned_to
  FROM deal_test_funnel AS filtered_deals
  INNER JOIN `hubspotUS.activities_cleaned` activities 
    ON filtered_deals.deal_name = activities.deal_name
    AND DATE(LEFT(activity_date,10)) <= date_change

  WHERE activity_type NOT IN ('(No value)')
  AND DATE(LEFT(activity_date,10)) >= deal_creation_date
  QUALIFY ROW_NUMBER() OVER(PARTITION BY deal_name,activity_date,activity_type ORDER BY activity_date) = 1
  ORDER BY deal_name,activity_date
),

first_activity_data AS (
  SELECT 
    deal_name,
    MIN(deal_creation_date) creation_date,
    MIN(DATE(LEFT(activity_date,10))) AS first_activity
    
  FROM `hubspotUS.sales_activity_analysis`
  GROUP BY 1
),

final_activity_filtering AS (
SELECT 
  *,
  
  CASE
    WHEN activity_type = 'Note' AND activity_type IN('Email sent to contact','Email reply from contact') THEN REGEXP_EXTRACT(note_body,r'Text:.*')
    ELSE old_email_body 
  END AS email_body, 
  ROW_NUMBER() OVER(PARTITION BY deal_name ORDER BY activity_date) activity_number,
  LAG(activity_date) OVER(PARTITION BY deal_name ORDER BY activity_date) previous_activity_date
  

FROM activity_filters
LEFT JOIN first_activity_data USING(deal_name)
WHERE CONCAT(old_activity_type,activity_type) NOT IN ('TaskTask','NoteNote')
)

SELECT * FROM final_activity_filtering
--AND deal_stage = 'Closed won'




--AND dealstage_funnel_ordered NOT LIKE '%0%' 
--AND dealstage_funnel_ordered NOT IN ('1.Top Funnel','2.Mid Funnel','3.Bottom Funnel')




